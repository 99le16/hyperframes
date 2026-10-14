import { resolve } from "node:path";
import { defineCommand } from "citty";
import type {
  AnalysisQuality,
  AudioCapability,
  OnsetMethod,
} from "@hyperframes/core/audio-analysis";
import type { Example } from "./_examples.js";
import { DEFAULT_CAPABILITIES, type AnalyzeOptions } from "../audio/analysis/analyze.js";
import { formatReport } from "../audio/analysis/format.js";
import { analyzeTargets, previewTarget } from "../audio/analysis/run.js";
import { filmTargets, type AudioTarget, type FilmQuery } from "../audio/analysis/targets.js";
import { describeProject } from "../timeline/describeProject.js";
import { CliUsageError } from "../utils/commandResult.js";
import { ensureDOMParser } from "../utils/dom.js";
import { resolveProject } from "../utils/project.js";
import { assertKnownFlags } from "../utils/reject-unknown-flags.js";
import { withMeta } from "../utils/updateCheck.js";

export const examples: Example[] = [
  ["Where a sound effect lands, its hits and loudness", "hyperframes audio sfx/whoosh.mp3"],
  ["Preview a file placed at 4.2 s, in film time", "hyperframes audio sfx/hit.wav --start 4.2"],
  ["Every sound playing at 12 s in the film", "hyperframes audio --at 12"],
  ["One clip of the film, as JSON", "hyperframes audio --element '#riser' --json"],
  [
    "Only onsets, from 60–200 Hz, finer",
    "hyperframes audio drums.wav --only onsets --band 60,200 --hop-ms 2",
  ],
];

const CAPABILITIES = new Set<string>([
  ...DEFAULT_CAPABILITIES,
  "beats",
  "sections",
  "words",
  "describe",
]);
const QUALITIES = new Set<AnalysisQuality>(["best", "local", "fast"]);

function number(name: string, raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new CliUsageError(`--${name} must be a number, got ${raw}`);
  return value;
}

function pair(name: string, raw: string | undefined): [number, number] | undefined {
  if (raw === undefined) return undefined;
  const parts = raw.split(",").map(Number);
  if (parts.length !== 2 || parts.some((n) => !Number.isFinite(n)) || parts[0]! >= parts[1]!)
    throw new CliUsageError(`--${name} takes two increasing numbers, like 2.5,4`);
  return parts as [number, number];
}

function capabilities(raw: string | undefined): AudioCapability[] {
  if (!raw) return [...DEFAULT_CAPABILITIES];
  const asked = raw
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const unknown = asked.filter((c) => !CAPABILITIES.has(c));
  if (unknown.length)
    throw new CliUsageError(
      `--only does not know ${unknown.join(", ")}; use ${[...CAPABILITIES].join(", ")}`,
    );
  return asked as AudioCapability[];
}

function pins(raw: string | undefined): AnalyzeOptions["provider"] {
  if (!raw) return undefined;
  return Object.fromEntries(
    raw.split(",").map((entry) => {
      const [capability, id] = entry.split("=").map((s) => s.trim());
      if (!capability || !id || !CAPABILITIES.has(capability))
        throw new CliUsageError(`--provider takes capability=provider pairs, like onsets=signal`);
      return [capability, id];
    }),
  );
}

function filmQuery(args: AudioFlags): FilmQuery | null {
  const given = (["element", "at", "range", "boundary"] as const).filter(
    (k) => args[k] !== undefined,
  );
  if (given.length > 1) throw new CliUsageError(`use one of --element, --at, --range, --boundary`);
  if (args.element) return { by: "element", ref: args.element };
  if (args.at !== undefined) return { by: "at", t: number("at", args.at)! };
  if (args.boundary !== undefined) return { by: "boundary", t: number("boundary", args.boundary)! };
  const range = pair("range", args.range);
  return range ? { by: "range", start: range[0], end: range[1] } : null;
}

interface AudioFlags {
  dir?: string;
  element?: string;
  at?: string;
  range?: string;
  boundary?: string;
  start?: string;
  "media-start"?: string;
  only?: string;
  quality?: string;
  provider?: string;
  "onset-method"?: string;
  threshold?: string;
  band?: string;
  "hop-ms"?: string;
  "onset-ratio"?: string;
  "tail-db"?: string;
  "silence-db"?: string;
}

function analyzeRequest(flags: AudioFlags): AnalyzeOptions {
  const quality = (flags.quality ?? "best") as AnalysisQuality;
  if (!QUALITIES.has(quality)) throw new CliUsageError("--quality is best, local or fast");
  const method = flags["onset-method"] as OnsetMethod | undefined;
  if (method && method !== "spectral-flux" && method !== "energy")
    throw new CliUsageError("--onset-method is spectral-flux or energy");
  const band = pair("band", flags.band);
  return {
    capabilities: capabilities(flags.only),
    quality,
    provider: pins(flags.provider),
    options: {
      onsets: { method, band, threshold: number("threshold", flags.threshold) },
      envelope: { band, hopMs: number("hop-ms", flags["hop-ms"]) },
      moments: {
        onsetRatio: number("onset-ratio", flags["onset-ratio"]),
        tailDb: number("tail-db", flags["tail-db"]),
      },
      silence: { thresholdDb: number("silence-db", flags["silence-db"]) },
    },
  };
}

async function fileTargets(files: string[], flags: AudioFlags): Promise<AudioTarget[]> {
  const start = number("start", flags.start);
  if (start !== undefined && files.length !== 1)
    throw new CliUsageError("--start previews exactly one file");
  const mediaStart = number("media-start", flags["media-start"]) ?? 0;
  const cwd = process.cwd();
  return Promise.all(
    files.map((file) => previewTarget(resolve(cwd, file), file, start ?? null, mediaStart)),
  );
}

async function clipTargets(flags: AudioFlags, query: FilmQuery | null): Promise<AudioTarget[]> {
  const project = resolveProject(flags.dir);
  ensureDOMParser();
  const timeline = await describeProject(project.indexPath);
  return filmTargets(project.dir, timeline, query ?? { by: "all" });
}

export default defineCommand({
  meta: {
    name: "audio",
    description: "Measure how sound moves in time: where it lands, its hits, loudness and silence",
  },
  args: {
    files: { type: "positional", description: "Audio or video files to analyze", required: false },
    dir: { type: "string", description: "Project directory, for film queries (default: current)" },
    element: {
      type: "string",
      description: "One audio or video clip of the film: #id, hf:id or audio/N",
    },
    at: { type: "string", description: "Every sound playing at this film second" },
    range: { type: "string", description: "Every sound playing in start,end film seconds" },
    boundary: { type: "string", description: "Every sound starting or ending at this film second" },
    start: { type: "string", description: "Preview a file placed at this film second" },
    "media-start": {
      type: "string",
      description: "With --start: seconds into the file the clip begins",
    },
    only: {
      type: "string",
      description: `Capabilities to measure (default ${DEFAULT_CAPABILITIES.join(",")})`,
    },
    quality: {
      type: "string",
      description: "best (any provider), local (this machine), fast (signal only)",
    },
    provider: { type: "string", description: "Pin capabilities to providers: onsets=signal,..." },
    "onset-method": { type: "string", description: "spectral-flux (default) or energy" },
    threshold: { type: "string", description: "Onset strength floor, 0–1 (default 0.1)" },
    band: { type: "string", description: "Measure onsets and envelope in lo,hi Hz only" },
    "hop-ms": {
      type: "string",
      description: "Envelope hop in ms (default: about 2,000 values per item)",
    },
    "onset-ratio": {
      type: "string",
      description: "Moments: onset is where RMS first reaches this share of the peak (0.2)",
    },
    "tail-db": {
      type: "string",
      description: "Moments: the tail ends this many dB under the peak (-40)",
    },
    "silence-db": { type: "string", description: "Silence below this level in dBFS (-50)" },
    full: {
      type: "boolean",
      description: "Include each capability's provider ladder",
      default: false,
    },
    json: { type: "boolean", description: "Output as JSON", default: false },
  },
  setup({ rawArgs, cmd }) {
    assertKnownFlags({ args: cmd.args }, rawArgs);
  },
  async run({ args }) {
    const flags = args as unknown as AudioFlags;
    const files = args._.map(String);
    const query = filmQuery(flags);
    if (files.length && query) throw new CliUsageError("give files or a film query, not both");
    const targets = files.length
      ? await fileTargets(files, flags)
      : await clipTargets(flags, query);
    const report = await analyzeTargets(targets, analyzeRequest(flags), Boolean(args.full));
    console.log(args.json ? JSON.stringify(withMeta(report)) : formatReport(report));
  },
});
