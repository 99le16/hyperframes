import { afterEach, expect, it, vi } from "vitest";
import { CheckDeadline, CheckDeadlineError } from "./checkDeadline.js";

afterEach(() => vi.useRealTimers());

function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
}

it("readiness and later sampling spend one 120-second budget", async () => {
  vi.useFakeTimers();
  const deadline = new CheckDeadline();
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
  const audit = deadline.run(() => new Promise(() => {}));
  const failed = expect(audit).rejects.toBeInstanceOf(CheckDeadlineError);
  await vi.advanceTimersByTimeAsync(120_000);
  await failed;
  const closing = expect(deadline.close()).rejects.toThrow("draining check cleanup");
  await vi.advanceTimersByTimeAsync(1_000);
  await closing;
}, 2_000);
