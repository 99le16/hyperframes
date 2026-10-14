import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { findFfBinary } from "@hyperframes/parsers/ff-binaries";
import type { Moments, Onsets } from "@hyperframes/core/audio-analysis";
import { formatReport } from "./format.js";
import { analyzeTargets, previewTarget } from "./run.js";

const RATE = 48_000;
const dir = mkdtempSync(join(tmpdir(), "hf-audio-run-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** A stereo 32-bit float WAV of `seconds`, each sample from `fill`. */
function wav(name: string, seconds: number, fill: (t: number) => number): string {
  const frames = Math.round(seconds * RATE);
  const data = Buffer.alloc(frames * 8);
  for (let i = 0; i < frames; i++) {
    const v = fill(i / RATE);
    data.writeFloatLE(v, i * 8);
    data.writeFloatLE(v, i * 8 + 4);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(3, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 8, 28);
  header.writeUInt16LE(8, 32);
  header.writeUInt16LE(32, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  const path = join(dir, name);
  writeFileSync(path, Buffer.concat([header, data]));
  return path;
}

let seed = 3;
const noise = () =>
  ((seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648) / 2_147_483_648) * 2 - 1;
const hit = (at: number) => (t: number) =>
  t < at ? 0 : 0.8 * Math.exp(-(t - at) / 0.04) * noise();

const ffmpeg = findFfBinary("ffmpeg") && findFfBinary("ffprobe");

describe.skipIf(!ffmpeg)("analyzeTargets", () => {
  it("reports a file's moments and hits in file seconds, with its format", async () => {
    const path = wav("two-hits.wav", 2, (t) => hit(0.5)(t) + 0.5 * hit(1.3)(t));
    const report = await analyzeTargets([await previewTarget(path, "two-hits.wav", null)], {
      capabilities: ["moments", "onsets"],
    });
    const [item] = report.items;
    expect(item).toMatchObject({ sampleRate: RATE, channels: 2, element: null, placement: null });
    expect((item!.moments as Moments).onset).toBeCloseTo(0.5, 2);
    const hits = (item!.onsets as Onsets).events.map((e) => e.t);
    expect(hits.map((t) => Math.round(t * 100) / 100)).toEqual([0.5, 1.3]);
  });

  it("places a previewed file in the film and prints film seconds", async () => {
    const path = wav("one-hit.wav", 1, hit(0.25));
    const target = await previewTarget(path, "one-hit.wav", 4, 0.1);
    expect(target.placement).toEqual({
      start: 4,
      end: 4.9,
      dataStart: 4,
      mediaStart: 0.1,
      playbackRate: 1,
      volume: 1,
    });
    const report = await analyzeTargets([target], { capabilities: ["moments"] });
    expect((report.items[0]!.moments as Moments).onset).toBeCloseTo(0.25, 2);
    expect(formatReport(report)).toMatch(/onset 4\.1[45]\d/);
  });

  it("finds no hit where a window cuts into a sound that is already playing", async () => {
    const path = wav("bed.wav", 3, (t) => 0.3 * noise() + hit(2)(t));
    const report = await analyzeTargets(
      [
        {
          path,
          file: "bed.wav",
          ref: "#bed",
          kind: "audio",
          placement: null,
          window: { from: 1, seconds: 1.5 },
        },
      ],
      { capabilities: ["onsets"] },
    );
    const hits = (report.items[0]!.onsets as Onsets).events.map((e) => e.t);
    expect(hits.some((t) => Math.abs(t - 2) < 0.01)).toBe(true);
    expect(hits.some((t) => t < 1.05 || t > 2.45)).toBe(false);
  });

  it("reports a file it cannot read on that item and goes on to the next", async () => {
    const broken = join(dir, "notes.txt");
    writeFileSync(broken, "not audio");
    const good = wav("good.wav", 0.5, hit(0.1));
    const report = await analyzeTargets(
      [await previewTarget(broken, "notes.txt", null), await previewTarget(good, "good.wav", null)],
      { capabilities: ["moments"] },
    );
    expect(report.items[0]!.error).toMatch(/^could not read: /);
    expect(report.items[1]!.moments).not.toBeNull();
  });
});
