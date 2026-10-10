import { afterEach, describe, expect, it, vi } from "vitest";
import { get } from "node:http";
import { createInPlaceSources, relayInPlaceSource, watchRelayedReads } from "./inPlaceSources.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const mp4Head = () => new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70]);
const rangeResponse = (etag: string) =>
  new Response(mp4Head(), { status: 206, headers: { etag, "content-length": "8" } });

function read(
  url: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; headers: Record<string, unknown>; body: Buffer }> {
  return new Promise((resolve, reject) => {
    get(url, { headers }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () =>
        resolve({
          status: response.statusCode ?? 0,
          headers: response.headers,
          body: Buffer.concat(chunks),
        }),
      );
      response.on("error", reject);
    }).on("error", reject);
  });
}

describe("createInPlaceSources", () => {
  it("asks once for the entity tag of a media source that serves the requested range", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => rangeResponse('"v1"'));
    vi.stubGlobal("fetch", fetchMock);
    const inPlaceSources = createInPlaceSources();

    const source = await inPlaceSources("https://media.example/take.mp4");
    expect(source).toMatchObject({ url: "https://media.example/take.mp4", etag: '"v1"' });
    expect(source?.readUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/./);
    await expect(inPlaceSources("https://media.example/take.mp4")).resolves.toBe(source);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      redirect: "manual",
      headers: { range: "bytes=0-511" },
    });
  });

  it.each([
    [
      "ignores the range",
      () => new Response(mp4Head(), { status: 200, headers: { etag: '"v1"' } }),
    ],
    [
      "has no entity tag",
      () => new Response(mp4Head(), { status: 206, headers: { "content-length": "8" } }),
    ],
    ["has only a weak entity tag", () => rangeResponse('W/"v1"')],
    [
      "redirects",
      () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://169.254.169.254/latest/meta-data/" },
        }),
    ],
    [
      "is an HLS playlist, whose segments FFmpeg would fetch itself",
      () =>
        new Response("#EXTM3U\nhttp://10.0.0.1/segment.ts\n", {
          status: 206,
          headers: { etag: '"v1"', "content-length": "34" },
        }),
    ],
    [
      "returns a text document",
      () =>
        new Response("<Error>AccessDenied</Error>", {
          status: 206,
          headers: { etag: '"v1"', "content-length": "26" },
        }),
    ],
  ])("is not read in place when it %s", async (_case, response) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response()));

    await expect(createInPlaceSources()("https://media.example/take.mp4")).resolves.toBeUndefined();
  });

  it("reads Matroska and WebM in place", async () => {
    const ebml = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(ebml, { status: 206, headers: { etag: '"v1"', "content-length": "8" } }),
        ),
    );

    await expect(createInPlaceSources()("https://media.example/take.webm")).resolves.toMatchObject({
      etag: '"v1"',
    });
  });

  it("never fetches a local path or a URL the downloader would reject", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const inPlaceSources = createInPlaceSources();

    await expect(inPlaceSources("/tmp/take.mp4")).resolves.toBeUndefined();
    await expect(inPlaceSources("http://media.example/take.mp4")).resolves.toBeUndefined();
    await expect(inPlaceSources("https://169.254.169.254/take.mp4")).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("relayInPlaceSource", () => {
  const url = "https://media.example/take.mp4";

  it("reads the range it is asked for at the version it was given", async () => {
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(mp4Head().slice(2, 6), {
          status: 206,
          headers: { "content-range": "bytes 2-5/8", "content-length": "4", etag: '"v1"' },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { readUrl } = await relayInPlaceSource(url, '"v1"');

    const response = await read(readUrl, { range: "bytes=2-5" });

    expect(response.status).toBe(206);
    expect(response.headers["content-range"]).toBe("bytes 2-5/8");
    expect([...response.body]).toEqual([0, 0x20, 0x66, 0x74]);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(url);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      redirect: "manual",
      headers: { range: "bytes=2-5", "if-match": '"v1"' },
    });
  });

  it("reads an open-ended range in growing windows, so a hang-up stops the transfer", async () => {
    const file = Buffer.alloc(3.5 * 2 ** 20, 7);
    const asked: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const range = (init.headers as Record<string, string>).range!;
        asked.push(range);
        const [, from, to] = /^bytes=(\d+)-(\d+)$/.exec(range)!.map(Number);
        const end = Math.min(to!, file.length - 1);
        return new Response(file.subarray(from, end + 1), {
          status: 206,
          headers: { "content-range": `bytes ${from}-${end}/${file.length}` },
        });
      }),
    );
    const { readUrl } = await relayInPlaceSource(url, '"v1"');

    const response = await read(readUrl, { range: "bytes=100-" });

    expect(response.status).toBe(206);
    expect(response.headers["content-range"]).toBe(`bytes 100-${file.length - 1}/${file.length}`);
    expect(response.body.equals(file.subarray(100))).toBe(true);
    const mb = 2 ** 20;
    expect(asked).toEqual([
      `bytes=100-${100 + mb - 1}`,
      `bytes=${100 + mb}-${100 + 3 * mb - 1}`,
      `bytes=${100 + 3 * mb}-${100 + 7 * mb - 1}`,
    ]);
  });

  it("cuts the connection when the source sends less than it said", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Uint8Array(10), {
            status: 206,
            headers: { "content-range": "bytes 0-1048575/5000000" },
          }),
      ),
    );
    const { readUrl } = await relayInPlaceSource(url, '"v1"');

    await expect(read(readUrl, { range: "bytes=0-" })).rejects.toThrow();
  });

  it("fails a read of a source replaced since its version was taken", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 412 })));
    const { readUrl } = await relayInPlaceSource(url, '"v1"');

    await expect(read(readUrl, { range: "bytes=0-" })).resolves.toMatchObject({ status: 412 });
  });

  it.each([
    ["a private address", "https://169.254.169.254/latest/meta-data/"],
    ["plain HTTP", "http://media.example/take.mp4"],
  ])("never follows a redirect to %s", async (_case, location) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 302, headers: { location } }));
    vi.stubGlobal("fetch", fetchMock);
    const { readUrl } = await relayInPlaceSource(url, '"v1"');

    await expect(read(readUrl, { range: "bytes=0-" })).resolves.toMatchObject({ status: 502 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports a source that fails partway through a read to the run that read it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        const range = (init.headers as Record<string, string>).range!;
        if (!range.startsWith("bytes=0-")) return new Response(null, { status: 503 });
        return new Response(new Uint8Array(2 ** 20), {
          status: 206,
          headers: { "content-range": `bytes 0-${2 ** 20 - 1}/${4 * 2 ** 20}` },
        });
      }),
    );
    const { readUrl } = await relayInPlaceSource("https://media.example/fails.mp4", '"v1"');
    const failure = watchRelayedReads(["-i", readUrl]);
    const unrelated = watchRelayedReads(["-i", "/tmp/take.mp4"]);

    await expect(read(readUrl, { range: "bytes=0-" })).rejects.toThrow();

    expect(failure()).toMatch(/503/);
    expect(unrelated()).toBeUndefined();
    expect(watchRelayedReads(["-i", readUrl])()).toBeUndefined();
  });

  it("does not report FFmpeg hanging up as a failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(new Uint8Array(2 ** 20), {
            status: 206,
            headers: { "content-range": `bytes 0-${2 ** 20 - 1}/${4 * 2 ** 20}` },
          }),
      ),
    );
    const { readUrl } = await relayInPlaceSource("https://media.example/hang-up.mp4", '"v1"');
    const failure = watchRelayedReads([readUrl]);

    await new Promise<void>((resolve) => {
      get(readUrl, { headers: { range: "bytes=0-" } }, (response) => {
        response.once("data", () => {
          response.destroy();
          setTimeout(resolve, 100);
        });
      });
    });

    expect(failure()).toBeUndefined();
  });

  it("serves only the sources it was given", async () => {
    const { readUrl } = await relayInPlaceSource(url, '"v1"');
    const origin = new URL(readUrl).origin;

    await expect(read(`${origin}/unknown`)).resolves.toMatchObject({ status: 404 });
  });
});
