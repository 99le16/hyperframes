import { existsSync } from "node:fs";
import type { AudioCapability, LadderStep } from "@hyperframes/core/audio-analysis";
import { analyzeSignal, type AnalyzeOptions } from "./analyze.js";
import { decodeAudio, probeAudio, type AudioStreamInfo } from "./decode.js";
import type { AudioTarget, Placement } from "./targets.js";

export interface AudioItem {
  file: string;
  ref: string | null;
  /** The clip's element in the film; `null` for a file given by path. */
  element: "audio" | "video" | null;
  placement: Placement | null;
  /** Times below are file seconds; film time = placement.start + (t − placement.mediaStart) / placement.playbackRate. */
  timebase: "file";
  window: { from: number; to: number } | null;
  duration: number | null;
  sampleRate: number | null;
  channels: number | null;
  provenance: Partial<Record<AudioCapability, string | null>>;
  ladder?: Partial<Record<AudioCapability, LadderStep[]>>;
  warnings: string[];
  error?: string;
  [capability: string]: unknown;
}

export interface AudioReport {
  version: 1;
  items: AudioItem[];
}

const round = (t: number) => Math.round(t * 1000) / 1000;

/** Onsets at a window's edges need the audio just past them to tell a hit from the cut. */
const EDGE_CONTEXT_SECONDS = 0.1;

/** A file the film does not play yet, placed where the caller would put it. */
export async function previewTarget(
  path: string,
  file: string,
  at: number | null,
  mediaStart = 0,
): Promise<AudioTarget> {
  if (at === null) return { path, file, ref: null, kind: "file", placement: null };
  const stream = existsSync(path) ? await probeAudio(path) : null;
  const length = stream ? stream.duration - mediaStart : 0;
  return {
    path,
    file,
    ref: null,
    kind: "file",
    placement: {
      start: at,
      end: round(at + length),
      dataStart: at,
      mediaStart,
      playbackRate: 1,
      volume: 1,
    },
    window: { from: mediaStart, seconds: length },
  };
}

const emptyItem = (target: AudioTarget): AudioItem => ({
  file: target.file,
  ref: target.ref,
  element: target.kind === "file" ? null : target.kind,
  placement: target.placement,
  timebase: "file",
  window: null,
  duration: null,
  sampleRate: null,
  channels: null,
  provenance: {},
  warnings: [],
});

function unreadable(target: AudioTarget): string | null {
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(target.file)) return "remote sources are not analyzed";
  if (!existsSync(target.path)) return "file not found";
  return null;
}

/** The part of the file to decode: the window, with up to `EDGE_CONTEXT_SECONDS` either side the file has. */
function decodeSpan(target: AudioTarget, stream: AudioStreamInfo) {
  const from = target.window?.from ?? 0;
  const seconds = target.window?.seconds ?? stream.duration - from;
  const before = Math.min(from, EDGE_CONTEXT_SECONDS);
  const after = Math.max(0, Math.min(EDGE_CONTEXT_SECONDS, stream.duration - from - seconds));
  return {
    from,
    read: { from: from - before, seconds: seconds + before + after },
    context: { before, after },
  };
}

async function analyzeTarget(
  target: AudioTarget,
  request: AnalyzeOptions,
  full: boolean,
): Promise<AudioItem> {
  const item = emptyItem(target);
  const problem = unreadable(target);
  if (problem) return { ...item, error: problem };
  const stream = await probeAudio(target.path);
  if (!stream) return { ...item, error: "no audio stream" };
  const { from, read, context } = decodeSpan(target, stream);
  const decoded = await decodeAudio(target.path, read, stream);
  if (!decoded) return { ...item, error: "no audio stream" };
  const analysis = await analyzeSignal(decoded.signal, { ...request, fileOffset: from, context });
  return {
    ...item,
    window: { from: round(from), to: round(from + analysis.analyzed) },
    duration: round(stream.duration),
    sampleRate: stream.sampleRate,
    channels: stream.channels,
    ...analysis.values,
    provenance: analysis.provenance,
    ...(full ? { ladder: analysis.ladder } : {}),
    warnings: analysis.warnings,
  };
}

export async function analyzeTargets(
  targets: readonly AudioTarget[],
  request: AnalyzeOptions,
  full = false,
): Promise<AudioReport> {
  const items: AudioItem[] = [];
  for (const target of targets) {
    try {
      items.push(await analyzeTarget(target, request, full));
    } catch (error) {
      const reason = error instanceof Error ? error.message.split("\n")[0]! : String(error);
      items.push({ ...emptyItem(target), error: `could not read: ${reason}` });
    }
  }
  return { version: 1, items };
}
