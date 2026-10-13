import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckDeadline, CheckDeadlineError, resolveCheckDeadlineMs } from "./checkDeadline.js";
import { DEFAULT_CHECK_OPTIONS } from "./checkPipeline.js";

afterEach(() => vi.useRealTimers());

function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), {
      once: true,
    });
  });
}

it("readiness and later sampling spend one 120-second budget", async () => {
  vi.useFakeTimers();
  const deadline = new CheckDeadline();
  deadline.start();
  try {
    await deadline.run(async () => "ready");
    await vi.advanceTimersByTimeAsync(90_000);
    const sample = deadline.run(() => rejectOnAbort(deadline.signal));
    const failed = expect(sample).rejects.toBeInstanceOf(CheckDeadlineError);
    await vi.advanceTimersByTimeAsync(30_000);
    await failed;
    expect(deadline.signal.aborted).toBe(true);
  } finally {
    await deadline.close();
  }
});

it("an expired check does not start its crop browser", async () => {
  vi.useFakeTimers();
  const deadline = new CheckDeadline();
  deadline.start();
  try {
    const audit = deadline.run(() => rejectOnAbort(deadline.signal));
    const failed = expect(audit).rejects.toBeInstanceOf(CheckDeadlineError);
    await vi.advanceTimersByTimeAsync(120_000);
    await failed;
    const crop = vi.fn(async () => []);
    await expect(deadline.run(crop)).rejects.toBeInstanceOf(CheckDeadlineError);
    expect(crop).not.toHaveBeenCalled();
  } finally {
    await deadline.close();
  }
});

it("cleanup is bounded even when a losing operation ignores cancellation", async () => {
  vi.useFakeTimers();
  const deadline = new CheckDeadline();
  deadline.start();
  const audit = deadline.run(() => new Promise(() => {}));
  const failed = expect(audit).rejects.toBeInstanceOf(CheckDeadlineError);
  await vi.advanceTimersByTimeAsync(120_000);
  await failed;
  const closing = expect(deadline.close()).rejects.toThrow("draining check cleanup");
  await vi.advanceTimersByTimeAsync(1_000);
  await closing;
}, 2_000);

it("browser provisioning does not spend the check budget, which starts once when ready", async () => {
  vi.useFakeTimers();
  const deadline = new CheckDeadline();
  let complete!: () => void;
  const work = new Promise<void>((resolve) => {
    complete = resolve;
  });
  const outcome = deadline.run(() => work).catch((error: unknown) => error);
  try {
    await vi.advanceTimersByTimeAsync(150_000);
    expect(deadline.signal.aborted).toBe(false);
    deadline.start();
    await vi.advanceTimersByTimeAsync(90_000);
    deadline.start();
    await vi.advanceTimersByTimeAsync(29_999);
    expect(deadline.signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(deadline.signal.aborted).toBe(true);
    expect(await outcome).toBeInstanceOf(CheckDeadlineError);
  } finally {
    complete();
    await outcome;
    await deadline.close();
  }
});

it("closing before browser readiness prevents a later clock from starting", async () => {
  vi.useFakeTimers();
  const deadline = new CheckDeadline();
  await deadline.close();
  deadline.start();
  await vi.advanceTimersByTimeAsync(150_000);
  expect(vi.getTimerCount()).toBe(0);
  expect(deadline.signal.aborted).toBe(false);
});

describe("resolveCheckDeadlineMs", () => {
  it("keeps the 120-second budget for the default and other small --timeout values", () => {
    expect(resolveCheckDeadlineMs(DEFAULT_CHECK_OPTIONS, {})).toBe(120_000);
    expect(resolveCheckDeadlineMs({ timeout: 500, snapshots: true }, {})).toBe(120_000);
  });

  it("adds every --timeout-governed wait above the default, so readiness cannot eat the budget", () => {
    // Navigation, render-ready and the audio audit each wait up to 180s.
    expect(resolveCheckDeadlineMs({ timeout: 180_000, snapshots: false }, {})).toBe(
      120_000 + 3 * 177_000,
    );
    // --snapshots opens a crop session that waits on navigation and render-ready again.
    expect(resolveCheckDeadlineMs({ timeout: 90_000, snapshots: true }, {})).toBe(
      120_000 + 5 * 87_000,
    );
  });

  it("takes its base from HYPERFRAMES_CHECK_DEADLINE_MS and still honours --timeout", () => {
    const env = { HYPERFRAMES_CHECK_DEADLINE_MS: "600000" };
    expect(resolveCheckDeadlineMs(DEFAULT_CHECK_OPTIONS, env)).toBe(600_000);
    expect(resolveCheckDeadlineMs({ timeout: 13_000, snapshots: false }, env)).toBe(630_000);
    expect(
      resolveCheckDeadlineMs(DEFAULT_CHECK_OPTIONS, { HYPERFRAMES_CHECK_DEADLINE_MS: " 30000 " }),
    ).toBe(30_000);
  });

  it("ignores an override that is not a positive integer of milliseconds", () => {
    for (const value of ["", "0", "-5000", "1.5e5", "90s", "abc", "300000.5"]) {
      expect(
        resolveCheckDeadlineMs(DEFAULT_CHECK_OPTIONS, { HYPERFRAMES_CHECK_DEADLINE_MS: value }),
      ).toBe(120_000);
    }
  });

  it("stays a bounded Node timer however large the inputs", () => {
    const huge = { HYPERFRAMES_CHECK_DEADLINE_MS: "99999999999999" };
    expect(resolveCheckDeadlineMs(DEFAULT_CHECK_OPTIONS, huge)).toBe(2_147_483_647);
    expect(resolveCheckDeadlineMs({ timeout: 1e12, snapshots: true }, {})).toBe(2_147_483_647);
  });
});

it("expires at the resolved deadline and names it with how to raise it", async () => {
  vi.useFakeTimers();
  const deadline = new CheckDeadline(300_000);
  deadline.start();
  try {
    const audit = deadline.run(() => rejectOnAbort(deadline.signal));
    const failed = expect(audit).rejects.toThrow(
      "Check did not finish within its 300s deadline (raise with HYPERFRAMES_CHECK_DEADLINE_MS=<ms>, or --timeout <ms> for a slow-loading composition).",
    );
    await vi.advanceTimersByTimeAsync(299_999);
    expect(deadline.signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await failed;
  } finally {
    await deadline.close();
  }
});

it("names the unfinished script and the deadline when a source file is known", () => {
  expect(new CheckDeadlineError(120_500, "compositions/intro.html").message).toBe(
    "compositions/intro.html: its script did not finish within the 120500ms check deadline (raise with HYPERFRAMES_CHECK_DEADLINE_MS=<ms>, or --timeout <ms> for a slow-loading composition).",
  );
});
