import { describe, expect, it } from "bun:test";
import { MEDIA_RENDER_ID_ATTR } from "@hyperframes/core";
import { resolveTimelineExtractionWindow } from "@hyperframes/engine";
import { collectRenderMedia } from "./renderMediaCollector.js";

describe("collectRenderMedia host windows", () => {
  it("schedules nested videos at resolved host id-ref windows", () => {
    const html =
      `<div data-composition-file="hook.html" data-composition-id="hook" data-start="0" data-duration="2">` +
      `<video ${MEDIA_RENDER_ID_ATTR}="red" id="red" src="red.mp4" data-start="0" data-duration="2"></video>` +
      `</div>` +
      `<div data-composition-file="body.html" data-composition-id="body" data-start="hook" data-duration="2">` +
      `<video ${MEDIA_RENDER_ID_ATTR}="blue" id="blue" src="blue.mp4" data-start="0" data-duration="2"></video>` +
      `</div>`;

    const { videos } = collectRenderMedia(html);
    expect(videos.find((v) => v.id === "red")).toMatchObject({ start: 0, end: 2 });
    expect(videos.find((v) => v.id === "blue")).toMatchObject({ start: 2, end: 4 });
  });

  it("closes a host authored with data-duration but no data-end", () => {
    // A slot shortened to 2s over a 4s scene file: the runtime hides the
    // scene's descendants past 2s, so the planner must stop its media there.
    const html =
      `<div data-composition-file="hook.html" data-composition-id="hook" data-start="0" data-duration="2">` +
      `<audio ${MEDIA_RENDER_ID_ATTR}="hook-sound" id="hook-sound" src="hook.m4a" data-start="0" data-duration="4" data-end="4"></audio>` +
      `<video ${MEDIA_RENDER_ID_ATTR}="late" id="late" src="late.mp4" data-start="2.5" data-duration="1" data-end="3.5"></video>` +
      `</div>` +
      `<div data-composition-file="body.html" data-composition-id="body" data-start="hook" data-duration="2">` +
      `<audio ${MEDIA_RENDER_ID_ATTR}="body-sound" id="body-sound" src="body.m4a" data-start="0" data-duration="4" data-end="4"></audio>` +
      `</div>`;

    const { videos, audios } = collectRenderMedia(html);
    expect(audios.find((a) => a.id === "hook-sound")).toMatchObject({ start: 0, end: 2 });
    expect(videos.find((v) => v.id === "late")).toBeUndefined();
    // A host whose start is an id-ref is bounded at resolved start + duration.
    expect(audios.find((a) => a.id === "body-sound")).toMatchObject({ start: 2, end: 4 });
  });

  it("prefers data-duration over a conflicting data-end, like the runtime", () => {
    // data-start 2 + data-duration 2 closes the host at 4 even though data-end
    // says 6; the runtime hides descendants at start + duration.
    const html =
      `<div data-composition-file="scene.html" data-composition-id="scene" data-start="2" data-duration="2" data-end="6">` +
      `<audio ${MEDIA_RENDER_ID_ATTR}="scene-sound" id="scene-sound" src="scene.m4a" data-start="0" data-duration="4" data-end="4"></audio>` +
      `<video ${MEDIA_RENDER_ID_ATTR}="scene-clip" id="scene-clip" src="scene.mp4" data-start="0" data-duration="4" data-end="4"></video>` +
      `</div>`;

    const { videos, audios } = collectRenderMedia(html);
    expect(audios.find((a) => a.id === "scene-sound")).toMatchObject({ start: 2, end: 4 });
    expect(videos.find((v) => v.id === "scene-clip")).toMatchObject({ start: 2, end: 4 });
  });

  it.each(["0", "-1"])(
    "treats a non-positive data-duration (%s) as absent instead of collapsing the host",
    (duration) => {
      const html =
        `<div data-composition-file="open.html" data-composition-id="open" data-start="1" data-duration="${duration}">` +
        `<video ${MEDIA_RENDER_ID_ATTR}="open-clip" id="open-clip" src="open.mp4" data-start="0" data-duration="3" data-end="3"></video>` +
        `</div>` +
        `<div data-composition-file="capped.html" data-composition-id="capped" data-start="1" data-duration="${duration}" data-end="3">` +
        `<video ${MEDIA_RENDER_ID_ATTR}="capped-clip" id="capped-clip" src="capped.mp4" data-start="0" data-duration="3" data-end="3"></video>` +
        `</div>`;

      const { videos } = collectRenderMedia(html);
      // No usable duration and no data-end: the host is unbounded, the clip keeps its own end.
      expect(videos.find((v) => v.id === "open-clip")).toMatchObject({ start: 1, end: 4 });
      // No usable duration: fall back to data-end.
      expect(videos.find((v) => v.id === "capped-clip")).toMatchObject({ start: 1, end: 3 });
    },
  );

  it("ignores a data-end at or before the host start instead of dropping nested media", () => {
    // The runtime treats an end that does not lie past the start as absent; the
    // planner must not collapse the window to hostStart and drop every clip.
    const html =
      `<div data-composition-file="scene.html" data-composition-id="scene" data-start="2" data-end="1">` +
      `<video ${MEDIA_RENDER_ID_ATTR}="scene-clip" id="scene-clip" src="scene.mp4" data-start="0" data-duration="3" data-end="3"></video>` +
      `</div>`;

    const { videos } = collectRenderMedia(html);
    expect(videos.find((v) => v.id === "scene-clip")).toMatchObject({ start: 2, end: 5 });
  });

  it("preserves an explicitly marked legacy-global media window", () => {
    const html =
      `<div data-composition-file="scene.html" data-composition-id="scene" data-start="2" data-duration="6">` +
      `<video ${MEDIA_RENDER_ID_ATTR}="local" id="local" src="local.mp4" data-start="2" data-duration="2" data-has-audio="true"></video>` +
      `<video ${MEDIA_RENDER_ID_ATTR}="global" id="global" src="global.mp4" data-start="2" data-duration="2" data-hf-media-start-basis="global" data-has-audio="true"></video>` +
      `</div>`;

    const { videos, audios } = collectRenderMedia(html);
    expect(videos.find((video) => video.id === "local")).toMatchObject({ start: 4, end: 6 });
    expect(videos.find((video) => video.id === "global")).toMatchObject({ start: 2, end: 4 });
    // Open-ended audio tracks close with the host (data-start 2 + data-duration 6).
    expect(audios.find((audio) => audio.id === "local-audio")).toMatchObject({ start: 4, end: 8 });
    expect(audios.find((audio) => audio.id === "global-audio")).toMatchObject({ start: 2, end: 8 });
  });
});

const media = (attrs: string) =>
  `<video ${MEDIA_RENDER_ID_ATTR}="clip" id="clip" src="clip.mp4" ${attrs}></video>` +
  `<audio ${MEDIA_RENDER_ID_ATTR}="vo" id="vo" src="vo.m4a" ${attrs}></audio>`;

describe("collectRenderMedia in-point hosts", () => {
  it("plays a head-trimmed scene's media from its in-point", () => {
    const html =
      `<div data-composition-id="scene" data-start="0" data-duration="12" data-playback-start="7">` +
      media(`data-start="0" data-duration="19" data-end="19"`) +
      `</div>`;

    const { videos, audios } = collectRenderMedia(html);
    const video = videos.find((v) => v.id === "clip")!;
    // Local 0 sits 7 s before the root; the engine trims that preroll from the source.
    expect(video).toMatchObject({ start: -7, end: 12, mediaStart: 0 });
    expect(resolveTimelineExtractionWindow(video, video.end - video.start, 12)).toMatchObject({
      compositionStart: 0,
      mediaStart: 7,
      durationSeconds: 12,
    });
    expect(audios.find((a) => a.id === "vo")).toMatchObject({ start: 0, end: 12, mediaStart: 7 });
  });

  it("cuts a split scene's media to the second half's slot", () => {
    const html =
      `<div data-composition-file="scene.html" data-composition-id="scene" data-start="5" data-duration="7" data-playback-start="5">` +
      media(`data-start="0" data-duration="12" data-end="12" data-playback-start="1"`) +
      `<audio ${MEDIA_RENDER_ID_ATTR}="early" id="early" src="early.m4a" data-start="1" data-duration="3" data-end="4"></audio>` +
      `<video ${MEDIA_RENDER_ID_ATTR}="early-clip" id="early-clip" src="early.mp4" data-start="1" data-duration="3"></video>` +
      `<audio ${MEDIA_RENDER_ID_ATTR}="fast" id="fast" src="fast.m4a" data-start="3" data-duration="20" data-end="23" data-playback-rate="2"></audio>` +
      `</div>`;

    const { videos, audios } = collectRenderMedia(html);
    // Video keeps its origin: frames before the host's start are hidden with the host.
    expect(videos.find((v) => v.id === "clip")).toMatchObject({ start: 0, end: 12, mediaStart: 1 });
    expect(audios.find((a) => a.id === "vo")).toMatchObject({ start: 5, end: 12, mediaStart: 6 });
    // Wholly before the in-point: never played.
    expect(audios.find((a) => a.id === "early")).toBeUndefined();
    expect(videos.find((v) => v.id === "early-clip")).toBeUndefined();
    // Cut at the host's end, its 2 s head consumed at 2x.
    expect(audios.find((a) => a.id === "fast")).toMatchObject({ start: 5, end: 12, mediaStart: 4 });
  });

  it("changes nothing for a host without an in-point", () => {
    const scene = (inPoint: string) =>
      `<div data-composition-id="inline" data-start="3" data-duration="4"${inPoint}>` +
      media(`data-start="1" data-duration="9" data-end="10" data-playback-start="2"`) +
      `</div>` +
      `<div data-composition-file="scene.html" data-composition-id="scene" data-start="2" data-duration="6"${inPoint}>` +
      `<video ${MEDIA_RENDER_ID_ATTR}="nested" id="nested" src="n.mp4" data-start="1" data-duration="9" data-has-audio="true"></video>` +
      `</div>`;

    const absent = collectRenderMedia(scene(""));
    expect(collectRenderMedia(scene(` data-playback-start="0"`))).toEqual(absent);
    expect(absent.audios.find((a) => a.id === "nested-audio")).toMatchObject({
      start: 3,
      end: 8,
      mediaStart: 0,
    });
  });
});
