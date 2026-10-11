import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WhisperUnavailableError } from "./whisper/manager.js";

const { transcribeMock, renderMock } = vi.hoisted(() => ({
  transcribeMock: vi.fn(),
  renderMock: vi.fn(),
}));
vi.mock("./whisper/transcribe.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./whisper/transcribe.js")>()),
  transcribe: transcribeMock,
}));
// Parakeet runs on parakeet-mlx in these tests, whatever this machine has installed.
vi.mock("./whisper/sherpa.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./whisper/sherpa.js")>()),
  sherpaParakeetInstalled: () => false,
}));
vi.mock("./background-removal/pipeline.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./background-removal/pipeline.js")>()),
  render: renderMock,
}));

import { RemoveBackgroundError, TranscribeError, removeBackground, transcribe } from "./api.js";

const SRT = `1
00:00:01,000 --> 00:00:03,500
Write HTML.

2
00:00:03,500 --> 00:00:06,000
Render video. Built for agents.
`;

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "hf-api-test-"));
  transcribeMock.mockReset();
  renderMock.mockReset();
  vi.spyOn(console, "log");
  vi.spyOn(console, "error");
});
afterEach(() => {
  // The API never prints: that is the CLI's job.
  expect(console.log).not.toHaveBeenCalled();
  expect(console.error).not.toHaveBeenCalled();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

function dummyAudio(): string {
  const input = join(dir, "narration.wav");
  writeFileSync(input, "not-real-audio");
  return input;
}

/** What a whisper run leaves behind: a one-word transcript in the output folder. */
function whisperResult(outputDir: string) {
  const transcriptPath = join(outputDir, "transcript.json");
  writeFileSync(transcriptPath, JSON.stringify([{ text: "hola", start: 0, end: 1 }]));
  return {
    model: "small.en",
    detectedLanguage: "es",
    transcriptPath,
    wordCount: 1,
    durationSeconds: 2,
    speechOnsetSeconds: null,
  };
}

async function transcribeError(options: Parameters<typeof transcribe>[0]) {
  const err = await transcribe(options).catch((e: unknown) => e);
  if (!(err instanceof TranscribeError)) throw new Error(`expected a TranscribeError, got ${err}`);
  return err;
}

describe("transcribe", () => {
  it("imports a transcript file into transcript.json", async () => {
    const input = join(dir, "sample.srt");
    writeFileSync(input, SRT);

    const result = await transcribe({ input });

    const transcriptPath = join(dir, "transcript.json");
    expect(result).toEqual({ kind: "imported", format: "srt", wordCount: 2, transcriptPath });
    expect(JSON.parse(readFileSync(transcriptPath, "utf8"))).toHaveLength(2);
  });

  it("writes only the caption file for a transcript input with captions", async () => {
    const input = join(dir, "words.json");
    writeFileSync(
      input,
      JSON.stringify([
        { text: "Yes", start: 0, end: 1 },
        { text: "No", start: 1, end: 2 },
      ]),
    );

    const result = await transcribe({ input, captions: { format: "srt", preserveCues: true } });

    const outputPath = join(dir, "transcript.srt");
    expect(result).toEqual({ kind: "exported", format: "srt", wordCount: 2, outputPath });
    expect(readFileSync(outputPath, "utf8")).toBe(
      "1\n00:00:00,000 --> 00:00:01,000\nYes\n\n2\n00:00:01,000 --> 00:00:02,000\nNo\n",
    );
    expect(existsSync(join(dir, "transcript.json"))).toBe(false);
  });

  it("transcribes with whisper and hands back the runner, status and progress", async () => {
    const input = dummyAudio();
    transcribeMock.mockImplementation(async (_input, outputDir, options) => {
      options.onProgress?.("Checking model...");
      options.onEvent?.({
        type: "progress",
        phase: "transcription",
        model: "small.en",
        status: "started",
      });
      return whisperResult(outputDir);
    });
    const onEngine = vi.fn();
    const onStatus = vi.fn();
    const onProgress = vi.fn();

    const result = await transcribe({
      input,
      engine: "whisper",
      model: "small.en",
      onEngine,
      onStatus,
      onProgress,
    });

    expect(result).toEqual({
      kind: "transcribed",
      engine: "whisper",
      model: "small.en",
      detectedLanguage: "es",
      wordCount: 1,
      durationSeconds: 2,
      speechOnsetSeconds: null,
      transcriptPath: join(dir, "transcript.json"),
    });
    expect(onEngine).toHaveBeenCalledExactlyOnceWith({
      runner: "whisper",
      engine: "whisper",
      model: "small.en",
    });
    expect(onStatus).toHaveBeenCalledWith("Checking model...");
    expect(onProgress).toHaveBeenCalledWith({
      type: "progress",
      phase: "transcription",
      model: "small.en",
      status: "started",
    });
  });

  it("asks whisper for progress only when the caller listens for it", async () => {
    // Whisper adds --print-progress whenever it gets an onEvent, so an unused one is not free.
    const input = dummyAudio();
    transcribeMock.mockImplementation(async (_input, outputDir) => whisperResult(outputDir));

    await transcribe({ input, engine: "whisper" });

    expect(transcribeMock.mock.calls[0]?.[2]).toMatchObject({
      onEvent: undefined,
      onProgress: undefined,
    });
  });

  it("stops on the caller's AbortSignal without installing process signal handlers", async () => {
    const input = dummyAudio();
    const controller = new AbortController();
    let handlersAdded = -1;
    let signal: unknown;
    transcribeMock.mockImplementation(async (_input, _outputDir, options) => {
      const before = process.listenerCount("SIGINT");
      signal = options.startCancellation();
      handlersAdded = process.listenerCount("SIGINT") - before;
      controller.abort();
      throw new Error("Command failed: whisper-cli");
    });

    const err = await transcribeError({ input, engine: "whisper", signal: controller.signal });

    expect(err.code).toBe("cancelled");
    expect(signal).toBe(controller.signal);
    expect(handlersAdded).toBe(0);
  });

  it("names a missing whisper as whisper_unavailable, with the original error as cause", async () => {
    const input = dummyAudio();
    const missing = new WhisperUnavailableError("whisper-cpp not found");
    transcribeMock.mockRejectedValue(missing);

    const err = await transcribeError({ input, engine: "whisper" });

    expect(err.code).toBe("whisper_unavailable");
    expect(err.cause).toBe(missing);
    expect(err.install).toBeUndefined();
  });

  it("adds the ASR program's last stderr lines to a failure", async () => {
    const input = dummyAudio();
    const crash = Object.assign(new Error("Command failed: whisper-cli"), {
      stderr: "loading model\nout of memory\n",
    });
    transcribeMock.mockRejectedValue(crash);

    const err = await transcribeError({ input, engine: "whisper" });

    expect(err.code).toBe("failed");
    expect(err.message).toBe("Command failed: whisper-cli\nloading model\nout of memory");
    expect(err.cause).toBe(crash);
  });

  it("reports the model whisper will run, not the English-only default", async () => {
    const input = dummyAudio();
    transcribeMock.mockImplementation(async (_input, outputDir) => whisperResult(outputDir));
    const onEngine = vi.fn();

    await transcribe({ input, engine: "whisper", language: "es", onEngine });

    expect(onEngine).toHaveBeenCalledWith(expect.objectContaining({ model: "small" }));
  });

  it("throws at once for a signal that is already aborted, before any setup", async () => {
    const input = dummyAudio();
    const controller = new AbortController();
    controller.abort();

    const err = await transcribeError({ input, engine: "whisper", signal: controller.signal });

    expect(err.code).toBe("cancelled");
    expect(transcribeMock).not.toHaveBeenCalled();
  });

  it.skipIf(process.platform === "win32")(
    "stops a running parakeet-mlx when the signal aborts",
    async () => {
      const pidFile = join(dir, "parakeet.pid");
      const runner = join(dir, "parakeet-mlx");
      writeFileSync(
        runner,
        `#!/bin/sh\n[ "$1" = --help ] && exit 0\necho $$ > "${pidFile}"\nexec sleep 30\n`,
      );
      chmodSync(runner, 0o755);
      vi.stubEnv("HYPERFRAMES_PARAKEET", runner);
      const controller = new AbortController();
      const started = Date.now();
      // Abort once the child is really running; a blocked event loop never gets this far.
      const poll = setInterval(() => {
        if (existsSync(pidFile) && readFileSync(pidFile, "utf8").trim()) controller.abort();
      }, 20);

      const err = await transcribeError({
        input: dummyAudio(),
        engine: "parakeet",
        signal: controller.signal,
      }).finally(() => clearInterval(poll));

      expect(err.code).toBe("cancelled");
      expect(Date.now() - started).toBeLessThan(10_000);
      const pid = Number(readFileSync(pidFile, "utf8"));
      expect(() => process.kill(pid, 0)).toThrow();
    },
  );

  it("keeps every import of the API modules at module scope", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const files = ["api.ts", ...readdirSync(join(here, "api")).map((f) => join("api", f))];
    const sources = files.filter((f) => !f.endsWith(".test.ts"));
    for (const file of sources) {
      expect(readFileSync(join(here, file), "utf8"), file).not.toMatch(/\bimport\(/);
    }
  });

  it.each([
    ["a missing input", () => ({ input: join(dir, "missing.wav") }), "input_not_found"],
    [
      "a transcript with no words",
      () => {
        writeFileSync(join(dir, "empty.json"), "[]");
        return { input: join(dir, "empty.json") };
      },
      "no_words",
    ],
    [
      "a timeout below the minimum",
      () => ({ input: dummyAudio(), timeoutMs: 100 }),
      "invalid_timeout",
    ],
  ])("rejects %s before any engine runs", async (_case, options, code) => {
    const err = await transcribeError(options());
    expect(err.code).toBe(code);
    expect(transcribeMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown caption format from an untyped caller", async () => {
    // @ts-expect-error -- plain JavaScript callers get no compile-time check.
    const err = await transcribeError({ input: dummyAudio(), captions: { format: "txt" } });
    expect(err).toMatchObject({
      code: "invalid_option",
      message: "Unsupported caption export format: txt. Use srt or vtt.",
    });
    expect(transcribeMock).not.toHaveBeenCalled();
  });
});

describe("removeBackground", () => {
  it("hands the pipeline absolute paths and returns its result", async () => {
    const rendered = {
      outputPath: resolve("cutout.webm"),
      framesProcessed: 3,
      durationSeconds: 1,
      avgMsPerFrame: 10,
      provider: "cpu",
      format: "webm",
    };
    renderMock.mockResolvedValue(rendered);
    const onProgress = vi.fn();

    const result = await removeBackground({
      input: "avatar.mp4",
      output: "cutout.webm",
      device: "cpu",
      quality: "fast",
      onProgress,
    });

    expect(result).toBe(rendered);
    expect(renderMock).toHaveBeenCalledExactlyOnceWith({
      inputPath: resolve("avatar.mp4"),
      outputPath: resolve("cutout.webm"),
      backgroundOutputPath: undefined,
      device: "cpu",
      quality: "fast",
      onProgress,
    });
  });

  async function rejected(options: Parameters<typeof removeBackground>[0]) {
    const err = await removeBackground(options).catch((e: unknown) => e);
    expect(renderMock).not.toHaveBeenCalled();
    return err;
  }

  it("rejects an unknown device or quality from an untyped caller", async () => {
    const paths = { input: "avatar.mp4", output: "cutout.webm" };
    // @ts-expect-error -- plain JavaScript callers get no compile-time check.
    expect(await rejected({ ...paths, device: "gpu" })).toMatchObject({
      name: "RemoveBackgroundError",
      code: "invalid_option",
      message: "Invalid device 'gpu'. Use: auto, cpu, coreml, cuda.",
    });
    // @ts-expect-error -- plain JavaScript callers get no compile-time check.
    expect(await rejected({ ...paths, quality: "max" })).toMatchObject({
      name: "RemoveBackgroundError",
      code: "invalid_option",
      message: "Invalid quality 'max'. Use: fast, balanced, best.",
    });
  });

  it("wraps a pipeline failure, keeping its message and the original as cause", async () => {
    const failure = new Error("ffmpeg and ffprobe are required.");
    renderMock.mockRejectedValue(failure);

    const err = await removeBackground({ input: "avatar.mp4", output: "cutout.webm" }).catch(
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(RemoveBackgroundError);
    expect(err).toMatchObject({ code: "failed", message: failure.message, cause: failure });
  });
});
