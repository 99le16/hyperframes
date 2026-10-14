import type { Browser, Page } from "puppeteer-core";
import { normalizeErrorMessage } from "./errorMessage.js";
import { withRemainingBudget } from "../capture/captureTimeout.js";
import { BrowserCleanupError, closeManagedBrowser } from "../browser/launch.js";

const BASE_DEADLINE_MS = 120_000;
const DEFAULT_TIMEOUT_INSIDE_BASE_MS = 3_000;
const AUDIT_SESSION_TIMEOUT_WAITS = ["navigation", "render-ready", "audio metadata"] as const;
const CROP_SESSION_TIMEOUT_WAITS = ["navigation", "render-ready"] as const;
const MAX_NODE_TIMER_MS = 2 ** 31 - 1;
const CHECK_DEADLINE_ENV = "HYPERFRAMES_CHECK_DEADLINE_MS";
const SCRIPT_START = "[hyperframes:script:start] ";
const SCRIPT_FINISH = "[hyperframes:script:finish] ";

export function resolveCheckDeadlineMs(
  options: { timeout: number; snapshots: boolean },
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env[CHECK_DEADLINE_ENV]?.trim() ?? "";
  const configured = /^\d+$/.test(raw) ? Number(raw) : 0;
  const base = configured > 0 ? configured : BASE_DEADLINE_MS;
  const timeoutWaits =
    AUDIT_SESSION_TIMEOUT_WAITS.length +
    (options.snapshots ? CROP_SESSION_TIMEOUT_WAITS.length : 0);
  const extraTimeoutMs = Math.max(0, options.timeout - DEFAULT_TIMEOUT_INSIDE_BASE_MS);
  return Math.min(MAX_NODE_TIMER_MS, base + timeoutWaits * extraTimeoutMs);
}

function formatDeadline(deadlineMs: number): string {
  return deadlineMs % 1_000 === 0 ? `${deadlineMs / 1_000}s` : `${deadlineMs}ms`;
}

export class CheckDeadlineError extends Error {
  constructor(
    deadlineMs: number,
    readonly sourceFile?: string,
  ) {
    const deadline = formatDeadline(deadlineMs);
    const raise = `raise with ${CHECK_DEADLINE_ENV}=<ms>, or --timeout <ms> for a slow-loading composition`;
    super(
      sourceFile === undefined
        ? `Check did not finish within its ${deadline} deadline (${raise}).`
        : `${sourceFile}: its script did not finish within the ${deadline} check deadline (${raise}).`,
    );
  }
}

/** One Node clock starts at the composition browser and spans readiness, sampling and crops. */
export class CheckDeadline {
  private readonly abort = new AbortController();
  private readonly operations = new Set<Promise<unknown>>();
  readonly signal = this.abort.signal;
  private readonly browsers = new Set<Browser>();
  private readonly scripts: string[] = [];
  private expired: CheckDeadlineError | undefined;
  private timer: NodeJS.Timeout | undefined;
  private readonly expiry: Promise<never>;
  private rejectExpiry!: (error: CheckDeadlineError) => void;
  private phase: "waiting" | "started" | "closed" = "waiting";

  constructor(private readonly deadlineMs: number = BASE_DEADLINE_MS) {
    this.expiry = new Promise((_, reject) => {
      this.rejectExpiry = reject;
    });
  }

  start = (): void => {
    if (this.phase !== "waiting") return;
    this.phase = "started";
    this.timer = setTimeout(() => {
      this.expired = new CheckDeadlineError(this.deadlineMs, this.scripts.at(-1));
      this.rejectExpiry(this.expired);
      this.abort.abort(this.expired);
    }, this.deadlineMs);
  };

  ownBrowser = (browser: Browser): void => {
    if (this.expired) throw this.expired;
    if (this.phase === "closed") throw new Error("Check has already finished.");
    this.browsers.add(browser);
  };

  async preparePage(page: Page): Promise<void> {
    page.on("console", (message) => {
      const text = message.text();
      if (text.startsWith(SCRIPT_START)) this.scripts.push(text.slice(SCRIPT_START.length));
      if (text.startsWith(SCRIPT_FINISH)) {
        const index = this.scripts.lastIndexOf(text.slice(SCRIPT_FINISH.length));
        if (index !== -1) this.scripts.splice(index, 1);
      }
    });
    await page.evaluateOnNewDocument(
      (start, finish) => {
        Reflect.set(window, "__hfScriptState", (phase: "start" | "finish", source: string) => {
          console.debug((phase === "start" ? start : finish) + source);
        });
      },
      SCRIPT_START,
      SCRIPT_FINISH,
    );
  }

  run<T>(operation: () => Promise<T>): Promise<T> {
    if (this.expired) return Promise.reject(this.expired);
    const pending = operation();
    this.operations.add(pending);
    return Promise.race([pending, this.expiry]);
  }

  async close(): Promise<void> {
    this.phase = "closed";
    clearTimeout(this.timer);
    const closes = await Promise.allSettled([...this.browsers].map(closeManagedBrowser));
    const errors = closes
      .filter((entry) => entry.status === "rejected")
      .map((entry) => entry.reason);
    try {
      const drained = await withRemainingBudget(
        Promise.allSettled(this.operations),
        1_000,
        "draining check cleanup",
      );
      for (const entry of drained) {
        if (entry.status === "rejected" && entry.reason instanceof BrowserCleanupError)
          errors.push(entry.reason);
      }
    } catch (error) {
      errors.push(error);
    }
    if (errors.length > 0)
      throw new BrowserCleanupError(errors, errors.map(normalizeErrorMessage).join("; "));
  }
}
