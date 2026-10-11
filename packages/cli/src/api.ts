/**
 * Programmatic entry for HyperFrames' own apps (`hyperframes/api`), so they can run CLI work
 * in-process instead of spawning the CLI. It is not a public API: it may change between minor
 * versions. Each function takes typed options and returns a typed result. It never prints, reads
 * argv or exits the process. Known failures throw TranscribeError or RemoveBackgroundError,
 * whose `code` says what went wrong and whose `cause` is the underlying error.
 */
import { runTranscribe, type TranscribeOptions, type TranscribeResult } from "./api/transcribe.js";

export {
  MIN_TIMEOUT_MS,
  TranscribeError,
  type CaptionFormat,
  type TranscribeCaptionsOptions,
  type TranscribeEngine,
  type TranscribeEngineEvent,
  type TranscribeErrorCode,
  type TranscribeOptions,
  type TranscribeProgressEvent,
  type TranscribeResult,
  type TranscribeRunner,
  type TranscriptFormat,
} from "./api/transcribe.js";
export {
  RemoveBackgroundError,
  removeBackground,
  type RemoveBackgroundDevice,
  type RemoveBackgroundErrorCode,
  type RemoveBackgroundOptions,
  type RemoveBackgroundProgress,
  type RemoveBackgroundQuality,
  type RemoveBackgroundResult,
} from "./api/removeBackground.js";

/**
 * Transcribe audio or video to word-level timestamps in `dir`/transcript.json, or import an
 * existing transcript (.json, .srt, .vtt) there. With `captions`, also write an SRT or VTT file;
 * for a transcript input, that caption file is the only thing written.
 */
export function transcribe(options: TranscribeOptions): Promise<TranscribeResult> {
  return runTranscribe(options);
}
