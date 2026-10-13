import type { Browser, Page } from "puppeteer-core";
import { normalizeErrorMessage } from "./errorMessage.js";
import { withRemainingBudget } from "../capture/captureTimeout.js";
import { BrowserCleanupError, closeManagedBrowser } from "../browser/launch.js";

const CHECK_DEADLINE_MS = 120_000;
// The --timeout the 120s base already absorbs; matches DEFAULT_CHECK_OPTIONS.timeout.
const BUDGETED_TIMEOUT_MS = 3_000;
// Waits that --timeout governs once the clock runs: navigation, render-ready and
// the audio-metadata audit in the audit session; navigation and render-ready
// again in the --snapshots crop session.
const AUDIT_SESSION_TIMEOUT_WAITS = 3;
const CROP_SESSION_TIMEOUT_WAITS = 2;
// Node's setTimeout fires at once for delays above 2^31-1 ms.
const MAX_TIMER_MS = 2_147_483_647;
const CHECK_DEADLINE_ENV = "HYPERFRAMES_CHECK_DEADLINE_MS";
const SCRIPT_START = "[hyperframes:script:start] ";
const SCRIPT_FINISH = "[hyperframes:script:finish] ";

/**
 * Total budget from composition-browser readiness to the last finding crop.
 *
 * The base is 120s, or `HYPERFRAMES_CHECK_DEADLINE_MS` when that is a positive
 * integer (anything else is ignored, like the other timeout env overrides).
 * Every wait that `--timeout` governs adds whatever the user asked for above the
 * default, so a larger `--timeout` never eats the budget left for sampling and
 * crops, while the default run keeps its 120s bound.
 */
export function resolveCheckDeadlineMs(
  options: { timeout: number; snapshots: boolean },
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env[CHECK_DEADLINE_ENV]?.trim() ?? "";
  const configured = /^\d+$/.test(raw) ? Number(raw) : 0;
  const base = configured > 0 ? configured : CHECK_DEADLINE_MS;
  const waits = AUDIT_SESSION_TIMEOUT_WAITS + (options.snapshots ? CROP_SESSION_TIMEOUT_WAITS : 0);
  const extension = waits * Math.max(0, options.timeout - BUDGETED_TIMEOUT_MS);
  return Math.min(MAX_TIMER_MS, base + extension);
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

  constructor(private readonly deadlineMs: number = CHECK_DEADLINE_MS) {
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
