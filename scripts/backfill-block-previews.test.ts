import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  cdnPreview,
  liveUrls,
  posterTime,
  previewToRecord,
  previewUrls,
  unpublishedFields,
} from "./catalog-preview-media.ts";
import { withPreview } from "./backfill-block-previews.ts";

const CDN = "https://static.heygen.ai/hyperframes-oss/docs/images/catalog";
const everythingLive = () => true;
const nothingLive = () => false;

describe("recording catalog previews", () => {
  it("records a component's published poster and video, as it does a block's", () => {
    assert.deepEqual(previewToRecord("component", "headline-slam", {}, everythingLive), {
      video: `${CDN}/components/headline-slam.mp4`,
      poster: `${CDN}/components/headline-slam.png`,
    });
    assert.deepEqual(previewToRecord("block", "app-showcase", {}, everythingLive), {
      video: `${CDN}/blocks/app-showcase.mp4`,
      poster: `${CDN}/blocks/app-showcase.png`,
    });
  });

  it("never records a file that is not published", () => {
    assert.equal(previewToRecord("component", "headline-slam", {}, nothingLive), null);
  });

  it("adds the published video to a component that declares only its poster", () => {
    const poster = `${CDN}/components/grain-overlay.png`;
    assert.deepEqual(previewToRecord("component", "grain-overlay", { poster }, everythingLive), {
      poster,
      video: `${CDN}/components/grain-overlay.mp4`,
    });
  });

  it("keeps a declared preview that points somewhere else and answers", () => {
    const promoted = {
      video: "https://static.heygen.ai/hyperframes/templates/promoted/abc/notes-reveal/preview.mp4",
      poster: "https://static.heygen.ai/hyperframes/templates/promoted/abc/notes-reveal/poster.jpg",
    };
    assert.equal(previewToRecord("block", "notes-reveal", promoted, everythingLive), null);
  });

  it("replaces a declared URL whose file is gone with the published CDN file", () => {
    const dead = "https://static.heygen.ai/hyperframes-oss/old/count-up.mp4";
    const cdnOnly = (url: string) => url.startsWith(CDN);
    assert.deepEqual(previewToRecord("component", "count-up", { video: dead }, cdnOnly), {
      video: `${CDN}/components/count-up.mp4`,
      poster: `${CDN}/components/count-up.png`,
    });
  });

  it("leaves a curated preview alone when only its own URL is published", () => {
    const own = {
      video: "https://static.heygen.ai/hyperframes-oss/registry/components/x/preview.mp4?v=1",
      poster: "https://static.heygen.ai/hyperframes-oss/registry/components/x/poster.png",
    };
    const ownOnly = (url: string) => url === own.video || url === own.poster;
    assert.ok(previewUrls("component", "x", own).includes(own.video));
    assert.equal(previewToRecord("component", "x", own, ownOnly), null);
    assert.deepEqual(unpublishedFields("component", "x", own, ownOnly), []);
  });

  it("owes a render for every field with no published file", () => {
    assert.deepEqual(unpublishedFields("component", "count-up", {}, nothingLive), [
      "video",
      "poster",
    ]);
    const posterOnly = (url: string) => url === cdnPreview("component", "count-up").poster;
    assert.deepEqual(unpublishedFields("component", "count-up", {}, posterOnly), ["video"]);
    assert.deepEqual(unpublishedFields("component", "count-up", {}, everythingLive), []);
  });
});

describe("writing the manifest", () => {
  const preview = { video: "v.mp4", poster: "p.png" };

  it("appends the preview and leaves every other byte as written", () => {
    const text = '{\n  "name": "x",\n  "syncPoints": [{ "offset": 1.0 }]\n}\n';
    assert.equal(
      withPreview(text, preview),
      '{\n  "name": "x",\n  "syncPoints": [{ "offset": 1.0 }],\n  "preview": {\n    "video": "v.mp4",\n    "poster": "p.png"\n  }\n}\n',
    );
  });

  it("replaces a declared preview in place", () => {
    const text = '{\n  "preview": { "poster": "p.png" },\n  "name": "x"\n}\n';
    assert.equal(
      withPreview(text, preview),
      '{\n  "preview": {\n    "video": "v.mp4",\n    "poster": "p.png"\n  },\n  "name": "x"\n}\n',
    );
  });
});

describe("checking what is published", () => {
  const answering = (statuses: Record<string, number>) =>
    (async (url: string) => new Response(null, { status: statuses[url] ?? 200 })) as typeof fetch;

  it("counts a 200 as published and a 403 or 404 as not", async () => {
    const live = await liveUrls(["a", "b", "c"], answering({ b: 403, c: 404 }));
    assert.deepEqual([...live], ["a"]);
  });

  it("fails rather than reading an outage as not published", async () => {
    await assert.rejects(liveUrls(["a"], answering({ a: 503 })), /HTTP 503/);
    const offline = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await assert.rejects(liveUrls(["a"], offline), /fetch failed/);
  });
});

describe("poster time", () => {
  it("defaults to 3 seconds in, or 60% of a shorter composition", () => {
    assert.equal(posterTime("<div></div>", 8), 3);
    assert.equal(posterTime("<div></div>", 2), 1.2);
  });

  it("takes the frame the entry names, inside the composition", () => {
    assert.equal(posterTime('<div data-poster-time="2.4"></div>', 8), 2.4);
    assert.equal(posterTime('<div data-poster-time="8"></div>', 8), 3);
  });

  it("puts caption-kinetic-slam's poster on a landed word, not between two", () => {
    const demo = readFileSync(
      resolve(import.meta.dirname, "../registry/components/caption-kinetic-slam/demo.html"),
      "utf-8",
    );
    // "HyperFrames" enters at 2.1 s and lands 0.22 s later; 3.0 s falls inside "write"'s entrance.
    assert.equal(posterTime(demo, 8), 2.4);
  });
});
