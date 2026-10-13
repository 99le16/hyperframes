import { isDegradableEvaluateTimeoutError, isNavigationTimeoutError } from "./captureTimeout.js";

export { isNavigationTimeoutError };

export const NETWORK_IDLE_ATTEMPT_MS = 30_000;

export type CaptureGotoWaitUntil = "networkidle2" | "domcontentloaded";

export interface CaptureGotoOptions {
  waitUntil: CaptureGotoWaitUntil;
  timeout: number;
}

export interface CaptureGotoPage<TResponse = unknown> {
  goto(url: string, options: CaptureGotoOptions): Promise<TResponse>;
}

export interface NavigateForCaptureResult<TResponse = unknown> {
  response: TResponse;
  waitUntil: CaptureGotoWaitUntil;
  networkIdleTimeoutMs: number;
  fellBackFromNetworkIdle: boolean;
}

export function networkIdleAttemptTimeoutMs(totalTimeoutMs: number): number {
  return Math.min(NETWORK_IDLE_ATTEMPT_MS, Math.max(0, totalTimeoutMs));
}

export async function navigateForCapture<TResponse>(
  page: CaptureGotoPage<TResponse>,
  url: string,
  totalTimeoutMs: number,
): Promise<NavigateForCaptureResult<TResponse>> {
  const networkIdleTimeoutMs = networkIdleAttemptTimeoutMs(totalTimeoutMs);
  try {
    const response = await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: networkIdleTimeoutMs,
    });
    return {
      response,
      waitUntil: "networkidle2",
      networkIdleTimeoutMs,
      fellBackFromNetworkIdle: false,
    };
  } catch (err) {
    if (!isNavigationTimeoutError(err) || networkIdleTimeoutMs >= totalTimeoutMs) {
      throw err;
    }
  }

  const fallbackTimeoutMs = totalTimeoutMs - networkIdleTimeoutMs;
  const response = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: fallbackTimeoutMs,
  });
  return {
    response,
    waitUntil: "domcontentloaded",
    networkIdleTimeoutMs,
    fellBackFromNetworkIdle: true,
  };
}

export interface PageReadyPage {
  waitForNetworkIdle(options: {
    idleTime: number;
    timeout: number;
    concurrency?: number;
  }): Promise<unknown>;
  evaluate(fn: () => unknown): Promise<unknown>;
}

export interface WaitForPageReadyOptions {
  /**
   * Wall-clock ceiling shared by the idle waits and the readyState poll —
   * each wait gets only the time still left. Pass the remaining capture
   * budget (min'd with 15_000) so the settle cannot outrun the stage.
   */
  timeoutMs?: number;
  /**
   * "always" pays one bounded idle wait up front — the post-click settle,
   * where a navigation or consent XHR is expected. "after-load" skips that
   * wait and idles only when the poll actually saw a loading document — a
   * cheap guard for stages that already settled the page.
   */
  networkIdle?: "always" | "after-load";
}

export async function waitForPageReady(
  page: PageReadyPage,
  options: WaitForPageReadyOptions = {},
): Promise<void> {
  const { timeoutMs = 15_000, networkIdle = "always" } = options;
  const deadline = Date.now() + timeoutMs;
  const remaining = () => Math.max(0, deadline - Date.now());
  const idle = () =>
    page
      // concurrency: 2 matches the networkidle2 semantic navigation already
      // uses, so one held-open request (long-poll, beacon) cannot block it.
      .waitForNetworkIdle({ idleTime: 500, timeout: remaining(), concurrency: 2 })
      .catch(() => {});

  if (networkIdle === "always" && remaining() > 0) await idle();

  // Poll the document out of a still-loading or mid-navigation state. The
  // bound is wall clock, not iteration count: each evaluate races the
  // remaining deadline, so a hung execution-context wait (~30s, or the
  // protocol timeout) cannot stretch the settle. Degradable protocol/stage
  // timeouts rethrow so the stage can degrade like the rest of capture.
  let waitedOutLoad = false;
  while (remaining() > 0) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const loading = await Promise.race([
      page
        .evaluate(() => document.readyState === "loading")
        .catch((err: unknown) => {
          if (isDegradableEvaluateTimeoutError(err)) throw err;
          return true;
        }),
      new Promise<true>((resolve) => {
        timer = setTimeout(() => resolve(true), Math.max(1, remaining()));
      }),
    ]).finally(() => {
      if (timer !== undefined) clearTimeout(timer);
    });
    if (!loading) break;
    waitedOutLoad = true;
    if (remaining() > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(500, remaining())));
    }
  }

  // A document we had to wait out keeps fetching once parsed — settle those
  // requests too, inside the same deadline.
  if (waitedOutLoad && remaining() > 0) await idle();
}
