/**
 * Remote media read in place: FFmpeg reads only the byte ranges it needs from the source's URL,
 * instead of a downloaded copy.
 *
 * FFmpeg never reads the URL itself. It reads a relay on 127.0.0.1, which fetches the URL with
 * the downloader's checks on every redirect hop and sends If-Match on every request. FFmpeg would
 * follow a redirect anywhere, and a read without If-Match would take a replaced file.
 */

import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { SNIFF_BYTES } from "./notMediaPayload.js";
import {
  assertPublicHttpsUrl,
  cancelResponseBody,
  fetchWithValidatedRedirects,
} from "./urlDownloader.js";

/** A remote source read in place, and the address FFmpeg reads it at. */
export interface InPlaceSource {
  url: string;
  /** Sent as If-Match with every read, so a replaced source fails instead of being read. */
  etag: string;
  readUrl: string;
}

/** The source to read a URL in place from, or undefined to download it. */
export type InPlaceSources = (url: string) => Promise<InPlaceSource | undefined>;

/** Asks once per URL, so every stage of one render agrees on which sources it reads in place. */
export function createInPlaceSources(signal?: AbortSignal): InPlaceSources {
  const sources = new Map<string, Promise<InPlaceSource | undefined>>();
  return (url) => {
    const known = sources.get(url);
    if (known) return known;
    const source = readInPlaceRangeEtag(url, signal).then((etag) =>
      etag ? relayInPlaceSource(url, etag) : undefined,
    );
    sources.set(url, source);
    return source;
  };
}

/**
 * The strong entity tag of a public HTTPS MP4, MOV, Matroska or WebM file that serves byte ranges
 * without redirecting, if it has one. If-Match never matches a weak tag, and it pins the bytes
 * checked here to the file FFmpeg reads.
 */
async function readInPlaceRangeEtag(
  url: string,
  signal?: AbortSignal,
): Promise<string | undefined> {
  const timeout = AbortSignal.timeout(30_000);
  try {
    assertPublicHttpsUrl(url);
    const response = await fetch(url, {
      headers: { range: `bytes=0-${SNIFF_BYTES - 1}`, "accept-encoding": "identity" },
      redirect: "manual",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    const etag = response.headers.get("etag");
    const length = Number(response.headers.get("content-length") ?? Number.NaN);
    if (response.status !== 206 || !etag || etag.startsWith("W/") || !(length <= SNIFF_BYTES)) {
      await cancelResponseBody(response);
      return undefined;
    }
    return isReadInPlaceContainer(Buffer.from(await response.arrayBuffer())) ? etag : undefined;
  } catch {
    return undefined;
  }
}

const ISO_BMFF_LEADING_BOXES = new Set(["ftyp", "moov", "mdat", "free", "skip", "wide"]);
const EBML_MAGIC = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);

/**
 * FFmpeg opens the URLs a playlist names (HLS, DASH, concat, SDP) itself, outside the relay. These
 * containers name none it follows: it ignores MOV data references unless told otherwise.
 */
function isReadInPlaceContainer(head: Buffer): boolean {
  return (
    ISO_BMFF_LEADING_BOXES.has(head.toString("latin1", 4, 8)) ||
    head.subarray(0, 4).equals(EBML_MAGIC)
  );
}

const relayed = new Map<string, { url: string; etag: string }>();
const relayTokens = new Map<string, string>();
let relayOrigin: Promise<string> | undefined;
let servedOrigin: string | undefined;
const failedReads = new Map<string, { count: number; reason: string }>();

/**
 * FFmpeg can take a relayed read cut short for the end of the file and exit 0 with fewer frames.
 * Call before running FFmpeg on `inputs`; the returned check names any relayed source among them
 * that failed during the run.
 */
export function watchRelayedReads(inputs: readonly string[]): () => string | undefined {
  const prefix = servedOrigin === undefined ? undefined : `${servedOrigin}/`;
  const tokens = prefix
    ? inputs.filter((input) => input.startsWith(prefix)).map((input) => input.slice(prefix.length))
    : [];
  const before = tokens.map((token) => failedReads.get(token)?.count ?? 0);
  return () => {
    const index = tokens.findIndex((token, i) => (failedReads.get(token)?.count ?? 0) > before[i]!);
    const failure = index < 0 ? undefined : failedReads.get(tokens[index]!);
    return failure && `reading a remote source in place failed: ${failure.reason}`;
  };
}

function recordFailedRead(token: string, reason: string): void {
  failedReads.set(token, { count: (failedReads.get(token)?.count ?? 0) + 1, reason });
}

/** A failure of the source, as opposed to FFmpeg hanging up. Its message names no URL. */
class RelayReadError extends Error {}

/** Serves a source a planner already read in place, at the same version, to this process's FFmpeg. */
export async function relayInPlaceSource(url: string, etag: string): Promise<InPlaceSource> {
  const key = `${etag}\0${url}`;
  let token = relayTokens.get(key);
  if (!token) {
    token = randomUUID();
    relayTokens.set(key, token);
    relayed.set(token, { url, etag });
  }
  relayOrigin ??= startRelay();
  return { url, etag, readUrl: `${await relayOrigin}/${token}` };
}

function startRelay(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((request, response) => void relay(request, response));
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.unref();
      servedOrigin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve(servedOrigin);
    });
  });
}

const RELAYED_HEADERS = ["accept-ranges", "content-length", "content-range", "content-type"];
const FIRST_WINDOW_BYTES = 1 << 20;
const MAX_WINDOW_BYTES = 8 << 20;

type ReadSource = (range: string | undefined) => Promise<Response>;

async function relay(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const token = request.url?.slice(1) ?? "";
  const source = relayed.get(token);
  if (!source || request.method !== "GET") {
    response.writeHead(source ? 405 : 404).end();
    return;
  }
  const controller = new AbortController();
  response.on("close", () => controller.abort());
  const read = sourceReader(token, source, controller);
  const asked = askedRange(request.headers.range);
  try {
    await (asked
      ? relayInWindows(asked.start, asked.end, read, response, controller.signal)
      : relayAsIs(await read(request.headers.range), response, controller.signal));
  } catch (error) {
    failRelay(token, error, controller.signal, response);
  }
}

function failRelay(
  token: string,
  error: unknown,
  signal: AbortSignal,
  response: ServerResponse,
): void {
  if (!signal.aborted) {
    const reason = error instanceof RelayReadError ? error.message : "the source could not be read";
    recordFailedRead(token, reason);
  }
  // A body cut short must not look complete to FFmpeg.
  if (response.headersSent) response.destroy();
  else response.writeHead(502).end();
}

function sourceReader(
  token: string,
  source: { url: string; etag: string },
  controller: AbortController,
): ReadSource {
  return async (range) => {
    const { response } = await fetchWithValidatedRedirects(source.url, controller, {
      "if-match": source.etag,
      ...(range ? { range } : {}),
    });
    // 416 is FFmpeg asking past the end, which it handles.
    if (!response.ok && response.status !== 416) {
      recordFailedRead(token, `the source answered ${response.status}`);
    }
    return response;
  };
}

function askedRange(header: string | undefined): { start: number; end: number } | undefined {
  const match = /^bytes=(\d+)-(\d*)$/.exec(header ?? "");
  if (!match) return undefined;
  return { start: Number(match[1]), end: match[2] ? Number(match[2]) : Number.POSITIVE_INFINITY };
}

async function relayAsIs(upstream: Response, response: ServerResponse, signal: AbortSignal) {
  response.writeHead(upstream.status, relayedHeaders(upstream));
  await writeBody(upstream, response, signal);
  response.end();
}

/**
 * FFmpeg asks for everything from an offset and hangs up once it has what it needs. The relay asks
 * the source for that in growing windows, so a hang-up stops the transfer within one window even
 * where fetch reads ahead of its reader (Bun reads the whole body).
 */
async function relayInWindows(
  askedStart: number,
  askedEnd: number,
  read: ReadSource,
  response: ServerResponse,
  signal: AbortSignal,
): Promise<void> {
  let start = askedStart;
  let window = FIRST_WINDOW_BYTES;
  const windowRange = () => `bytes=${start}-${Math.min(start + window, askedEnd + 1) - 1}`;
  let upstream = await read(windowRange());
  const total = contentRange(upstream)?.total;
  if (upstream.status !== 206 || total === undefined) {
    await relayAsIs(upstream, response, signal);
    return;
  }
  const end = Math.min(askedEnd, total - 1);
  response.writeHead(206, {
    ...relayedHeaders(upstream),
    "content-range": `bytes ${start}-${end}/${total}`,
    "content-length": String(end - start + 1),
  });
  for (;;) {
    start = await writeWindow(upstream, start, total, response, signal);
    if (start > end) break;
    window = Math.min(window * 2, MAX_WINDOW_BYTES);
    upstream = await read(windowRange());
  }
  response.end();
}

/** Writes one window of the source, checked against what was asked, and returns the offset after it. */
async function writeWindow(
  upstream: Response,
  start: number,
  total: number,
  response: ServerResponse,
  signal: AbortSignal,
): Promise<number> {
  const piece = contentRange(upstream);
  if (upstream.status !== 206 || piece?.start !== start || piece.total !== total) {
    throw new RelayReadError(`the source answered bytes ${start}- with ${upstream.status}`);
  }
  if ((await writeBody(upstream, response, signal)) !== piece.end - start + 1) {
    throw new RelayReadError(`the source sent a short body for bytes ${start}-${piece.end}`);
  }
  return piece.end + 1;
}

function relayedHeaders(upstream: Response): Record<string, string> {
  return Object.fromEntries(
    RELAYED_HEADERS.flatMap((name) => {
      const value = upstream.headers.get(name);
      return value === null ? [] : [[name, value]];
    }),
  );
}

function contentRange(
  upstream: Response,
): { start: number; end: number; total: number } | undefined {
  const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(upstream.headers.get("content-range") ?? "");
  return match
    ? { start: Number(match[1]), end: Number(match[2]), total: Number(match[3]) }
    : undefined;
}

/** Writes the body at the pace the client reads it, and returns its length. */
async function writeBody(
  upstream: Response,
  response: ServerResponse,
  signal: AbortSignal,
): Promise<number> {
  let length = 0;
  const reader = upstream.body?.getReader();
  for (;;) {
    const chunk = await reader?.read();
    if (!chunk || chunk.done) return length;
    length += chunk.value.byteLength;
    if (!response.write(chunk.value)) await once(response, "drain", { signal });
  }
}
