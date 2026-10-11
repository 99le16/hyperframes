import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getFfmpegBinary } from "../utils/ffmpegBinaries.js";
import { processCompositionAudio } from "./audioMixer.js";
import { extractVideoFramesRange, getFrameAtTime } from "./videoFrameExtractor.js";

const FFMPEG = getFfmpegBinary();
const HAS_FFMPEG = spawnSync(FFMPEG, ["-version"]).status === 0;
const SAMPLE_RATE = 48_000;
const LEAD_SECONDS = 7;
const CLIP_SECONDS = 12;

function ffmpeg(args: string[]): void {
  const result = spawnSync(FFMPEG, ["-nostdin", "-v", "error", "-y", ...args], {
    encoding: "utf-8",
  });
  if (result.status !== 0) throw new Error(result.stderr);
}

/** Per output second, the source second heard (the tone is 200 + 100 * source second Hz), or null for silence. */
function sourceSecondsHeard(path: string): Array<number | null> {
  const decoded = spawnSync(
    FFMPEG,
    ["-v", "error", "-i", path, "-ac", "1", "-ar", String(SAMPLE_RATE), "-f", "s16le", "-"],
    { maxBuffer: 1 << 28 },
  );
  if (decoded.status !== 0) throw new Error(decoded.stderr.toString());
  const pcm = decoded.stdout;
  const heard: Array<number | null> = [];
  const edge = 2_000;
  for (let second = 0; second < CLIP_SECONDS; second += 1) {
    let crossings = 0;
    let energy = 0;
    let previous = 0;
    for (let i = second * SAMPLE_RATE + edge; i < (second + 1) * SAMPLE_RATE - edge; i += 1) {
      const sample = pcm.readInt16LE(i * 2);
      energy += sample * sample;
      if (i > second * SAMPLE_RATE + edge && previous < 0 !== sample < 0) crossings += 1;
      previous = sample;
    }
    const windowSeconds = (SAMPLE_RATE - 2 * edge) / SAMPLE_RATE;
    const rms = Math.sqrt(energy / (SAMPLE_RATE - 2 * edge));
    heard.push(rms < 30 ? null : Math.round((crossings / 2 / windowSeconds - 200) / 100));
  }
  return heard;
}

describe.skipIf(!HAS_FFMPEG)(
  "sources whose audio and video streams start at different times",
  () => {
    const dir = mkdtempSync(join(tmpdir(), "hf-stream-start-"));

    beforeAll(() => {
      ffmpeg([
        "-f",
        "lavfi",
        "-i",
        "testsrc=size=64x36:rate=30:duration=20",
        "-c:v",
        "libx264",
        "-g",
        "300",
        "-pix_fmt",
        "yuv420p",
        join(dir, "picture.mp4"),
      ]);
      ffmpeg([
        "-f",
        "lavfi",
        "-i",
        `aevalsrc='0.1*sin(2*PI*(200+100*floor(t))*t)':s=${SAMPLE_RATE}:d=20`,
        "-c:a",
        "aac",
        join(dir, "steps.m4a"),
      ]);
      const lead = String(LEAD_SECONDS);
      const picture = join(dir, "picture.mp4");
      const steps = join(dir, "steps.m4a");
      const mux = ["-map", "0:v", "-map", "1:a", "-c", "copy"];
      ffmpeg(["-itsoffset", lead, "-i", picture, "-i", steps, ...mux, join(dir, "video-late.mp4")]);
      ffmpeg(["-i", picture, "-itsoffset", lead, "-i", steps, ...mux, join(dir, "audio-late.mp4")]);
    }, 60_000);

    afterAll(() => rmSync(dir, { recursive: true, force: true }));

    it.each([
      { source: "video-late.mp4", audioLead: 0, type: "video", mediaStart: 0 },
      { source: "video-late.mp4", audioLead: 0, type: "video", mediaStart: 3 },
      { source: "video-late.mp4", audioLead: 0, type: "audio", mediaStart: 0 },
      { source: "audio-late.mp4", audioLead: LEAD_SECONDS, type: "video", mediaStart: 0 },
      { source: "audio-late.mp4", audioLead: LEAD_SECONDS, type: "video", mediaStart: 3 },
      { source: "audio-late.mp4", audioLead: LEAD_SECONDS, type: "audio", mediaStart: 0 },
    ] as const)(
      "$source as <$type> from $mediaStart s plays each second where the browser plays it",
      async ({ source, audioLead, type, mediaStart }) => {
        const workDir = mkdtempSync(join(dir, "work-"));
        const outputPath = `${workDir}.m4a`;
        const result = await processCompositionAudio(
          [
            {
              id: "clip",
              src: source,
              start: 0,
              end: CLIP_SECONDS,
              mediaStart,
              layer: 0,
              volume: 1,
              type,
            },
          ],
          dir,
          workDir,
          outputPath,
          CLIP_SECONDS,
        );
        expect(result.success, JSON.stringify(result)).toBe(true);
        const expected = Array.from({ length: CLIP_SECONDS }, (_, second) => {
          const mediaTime = mediaStart + second;
          return mediaTime < audioLead ? null : mediaTime - audioLead;
        });
        expect(sourceSecondsHeard(outputPath)).toEqual(expected);
      },
      30_000,
    );

    // Chrome, seeking a late video stream, paints nothing until its first frame is under 1 s away.
    it("shows no video frame while a late video stream's first frame is a second or more away", async () => {
      const extracted = await extractVideoFramesRange(
        join(dir, "video-late.mp4"),
        "video-late",
        0,
        CLIP_SECONDS,
        { fps: 30, outputDir: join(dir, "frames") },
      );
      expect(getFrameAtTime(extracted, 1, 0)).toBeNull();
      expect(getFrameAtTime(extracted, LEAD_SECONDS - 1.1, 0)).toBeNull();
      expect(getFrameAtTime(extracted, LEAD_SECONDS - 0.9, 0)).not.toBeNull();
      expect(getFrameAtTime(extracted, 8, 0)).not.toBeNull();
    }, 30_000);

    it("keeps every frame of a video stream that starts first", async () => {
      const extracted = await extractVideoFramesRange(
        join(dir, "audio-late.mp4"),
        "audio-late",
        0,
        CLIP_SECONDS,
        { fps: 30, outputDir: join(dir, "frames") },
      );
      expect(getFrameAtTime(extracted, 0, 0)).not.toBeNull();
      expect(getFrameAtTime(extracted, 1, 0)).not.toBeNull();
    }, 30_000);
  },
);
