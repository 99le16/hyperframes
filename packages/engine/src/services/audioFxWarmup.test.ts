import { describe, expect, it } from "vitest";
import type { HfAudioFxChain } from "@hyperframes/core/audio-fx";
import { chainWarmupSeconds } from "./audioFxWarmup.js";

const chainOf = (...nodes: HfAudioFxChain["nodes"]): HfAudioFxChain => ({ version: 1, nodes });

describe("chainWarmupSeconds", () => {
  it("is the time a delay's repeats take to fall to -60 dB", () => {
    const delay = {
      type: "delay",
      enabled: true,
      params: { time: 5000, feedback: 0.95, mix: 0.5 },
    };
    expect(chainWarmupSeconds(chainOf(delay))).toBeCloseTo(135 * 5, 5);
  });

  it("is seven release times for a compressor", () => {
    const comp = { type: "compressor", enabled: true, params: { release: 9000 } };
    expect(chainWarmupSeconds(chainOf(comp))).toBeCloseTo(9 * Math.log(1000), 5);
  });

  it("adds a reverb's room and sums a serial chain", () => {
    const reverb = { type: "reverb", enabled: true, params: { size: 0.5, wet: 0.3 } };
    const delay = { type: "delay", enabled: true, params: { time: 300, feedback: 0.4, mix: 0.4 } };
    expect(chainWarmupSeconds(chainOf(reverb))).toBeCloseTo(0.6 + 1.3, 5);
    expect(chainWarmupSeconds(chainOf(delay, reverb))).toBeCloseTo(0.3 * 8 + 1.9, 5);
  });

  it("ignores nodes that are off or mixed out", () => {
    const off = { type: "delay", enabled: false, params: { time: 5000, feedback: 0.9, mix: 0.5 } };
    const dry = { type: "reverb", enabled: true, params: { size: 1, wet: 0 } };
    const mixedOut = {
      type: "delay",
      enabled: true,
      params: { time: 5000, feedback: 0.9, mix: 0 },
    };
    expect(chainWarmupSeconds(chainOf(off, dry, mixedOut))).toBe(0);
  });
});
