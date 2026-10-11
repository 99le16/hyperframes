/**
 * Collect the render pipeline's media list from the fully inlined document.
 *
 * Sub-composition media used to be gathered from each composition FILE before
 * inlining, then merged with the main document's media and deduplicated by
 * element id. That merge is unsound: ids are unique per file, not per render
 * document, so two scenes that both declare `<video id="clip">` — or that both
 * declare a bare `<video>` and get the per-file auto-id `hf-video-0` — collapse
 * into a single entry. See mediaRenderIds.ts for the full failure.
 *
 * Reading the inlined document instead makes the render document the single
 * source of truth for what media exists: every element is present exactly once,
 * `assignMediaRenderIds` has already given it a document-unique key, and the
 * timeline offsets are recoverable from the composition hosts it sits inside.
 */

import { parseHTML } from "linkedom";
import {
  MEDIA_RENDER_ID_ATTR,
  normalizeRateSpec,
  resolveAuthoredTimingWindow,
  shiftRateLane,
  sourceTimeAt,
} from "@hyperframes/core";
import {
  MEDIA_START_BASIS_ATTR,
  compositionOriginSeconds,
  cutToHostSlots,
  hostInPointSeconds,
  type HostSlot,
  readMediaStartBasis,
  resolveAbsoluteMediaStartSeconds,
  type MediaStartBasis,
} from "@hyperframes/core/media-timing";
import {
  parseVideoElements,
  parseImageElements,
  parseAudioElements,
  resolveReferencedStart,
  type RefResolverEl,
  type RefResolverDoc,
  type VideoElement,
  type ImageElement,
  type AudioElement,
} from "@hyperframes/engine";

/**
 * Marks a host element that `inlineSubCompositions` hoisted a composition into.
 * Set unconditionally on every inlined host, which makes it the reliable signal
 * for "this ancestor shifts its children along the timeline".
 */
const COMPOSITION_HOST_ATTR = "data-composition-file";

/**
 * Where a composition host closes in its parent's time, or null when unbounded.
 * Delegates to `resolveAuthoredTimingWindow`, the same window the runtime uses to hide descendants.
 */
function resolveHostEnd(host: Element, hostStart: number): number | null {
  return (
    resolveAuthoredTimingWindow({
      start: hostStart,
      duration: host.getAttribute("data-duration"),
      end: host.getAttribute("data-end"),
    })?.end ?? null
  );
}

interface HostWindow {
  /** Seconds to add to a descendant's authored, scene-relative start. */
  offset: number;
  /** Absolute time past which a descendant is outside its host, or Infinity. */
  limit: number;
  /** Whether authored media time is composition-local or legacy root-global. */
  basis: MediaStartBasis;
  /** Root-time slots of the enclosing hosts with an in-point. */
  slots: HostSlot[];
}

const ROOT_WINDOW: HostWindow = { offset: 0, limit: Infinity, basis: "local", slots: [] };

// Any composition host with an in-point counts, inline or anonymous, as in core's start resolver.
const isInPointHost = (element: Element): boolean =>
  element.matches("[data-composition-id], [data-composition-src]") &&
  hostInPointSeconds(element) > 0;

/** Composition hosts that place `element`, root first: inlined files, plus any host with an in-point. */
function enclosingHosts(element: Element): Element[] {
  const hosts: Element[] = [];
  for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
    if (ancestor.hasAttribute(COMPOSITION_HOST_ATTR) || isInPointHost(ancestor)) {
      hosts.unshift(ancestor);
    }
  }
  return hosts;
}

/**
 * Fold a media element's chain of composition hosts into one window.
 *
 * Host `data-start` is resolved the same way media is (`resolveReferencedStart`):
 * numeric literals, or an id / `data-composition-id` ref to a sibling slot's
 * end (`data-start="hook"`). `parseFloat("hook")` is 0, which stacked every
 * chained scene at 0–2s. Each host's end comes from `resolveHostEnd`, which
 * shares the runtime's timing resolver, so the planner's media windows match
 * the window in which the runtime shows the host's descendants.
 */
function resolveHostWindow(
  element: Element,
  document: RefResolverDoc,
  startCache: Map<RefResolverEl, number>,
  visiting: Set<RefResolverEl>,
): HostWindow {
  const hosts = enclosingHosts(element);
  if (hosts.length === 0) return ROOT_WINDOW;

  let offset = 0;
  let limit = Infinity;
  const slots: HostSlot[] = [];
  for (const host of hosts) {
    const hostStart = resolveReferencedStart(document, host, startCache, visiting);
    const hostEnd = resolveHostEnd(host, hostStart);
    if (hostEnd != null) limit = Math.min(limit, offset + hostEnd);
    if (hostInPointSeconds(host) > 0) {
      slots.push({ start: offset + hostStart, end: offset + (hostEnd ?? Infinity) });
    }
    offset += compositionOriginSeconds(hostStart, host);
  }
  const tag = element.tagName.toLowerCase();
  const basis =
    tag === "video" || tag === "audio"
      ? readMediaStartBasis(element.getAttribute(MEDIA_START_BASIS_ATTR))
      : "local";
  return {
    offset,
    limit,
    basis,
    slots,
  };
}

/**
 * Map each media id the parsers report (render id, else author id: render ids are only stamped
 * when files are inlined) to its hosts' window, keyed on id so two parses need not walk in step.
 */
function collectHostWindows(html: string): Map<string, HostWindow> {
  const { document } = parseHTML(html);
  const windows = new Map<string, HostWindow>();
  const startCache = new Map<RefResolverEl, number>();
  const visiting = new Set<RefResolverEl>();
  const media = `[${MEDIA_RENDER_ID_ATTR}], video[id], audio[id], img[id]`;
  for (const element of document.querySelectorAll(media)) {
    const id = element.getAttribute(MEDIA_RENDER_ID_ATTR) || element.getAttribute("id");
    if (!id) continue;
    windows.set(
      id,
      resolveHostWindow(element as unknown as Element, document, startCache, visiting),
    );
  }
  return windows;
}

/**
 * Shift a scene-relative window onto the root timeline; null when the clip starts after its host
 * ends (the file-tree walk's `start < absoluteEnd` drop) or its in-point hosts cut all of it.
 * `start` stays the clip's origin; `played` is the part the in-point hosts' slots keep.
 */
function toAbsoluteWindow(
  start: number,
  end: number,
  window: HostWindow,
): { start: number; end: number; played: { start: number; end: number } } | null {
  const absoluteStart = resolveAbsoluteMediaStartSeconds({
    authoredStart: start,
    hostStart: window.offset,
    basis: window.basis,
  });
  if (absoluteStart >= window.limit) return null;
  const absoluteEnd = resolveAbsoluteMediaStartSeconds({
    authoredStart: end,
    hostStart: window.offset,
    basis: window.basis,
  });
  const absolute = { start: absoluteStart, end: Math.min(absoluteEnd, window.limit) };
  const played = cutToHostSlots(absolute, window.slots);
  if (played.end === played.start && absolute.end > absolute.start) return null;
  return { start: absolute.start, end: played.end, played };
}

/** Start a clip where its in-point hosts let it play, that much further into its source. */
function startAtPlayed<T extends AudioElement | VideoElement>(
  clip: T,
  played: { start: number },
): T {
  const head = played.start - clip.start;
  // ponytail: a looping video keeps its origin (its loop runs from mediaStart), so a head cut
  // after 0 is not applied to it; that needs a visible start separate from the origin in the engine.
  if (head <= 0 || ("loop" in clip && clip.loop)) return clip;
  const rate = normalizeRateSpec(clip.playbackRate);
  return {
    ...clip,
    start: played.start,
    mediaStart: clip.mediaStart + sourceTimeAt(rate, head),
    playbackRate: shiftRateLane(rate, head),
  };
}

export interface RenderMedia {
  videos: VideoElement[];
  audios: AudioElement[];
  images: ImageElement[];
}

/**
 * Parse every media element in the inlined render document, with each clip's
 * window resolved onto the root timeline.
 *
 * Expects `assignMediaRenderIds` to have run: the parsers report the stamped
 * render id as each element's `id`, which is what the rest of the pipeline
 * keys on and what the engine resolves back to a DOM node.
 */
export function collectRenderMedia(html: string): RenderMedia {
  const windows = collectHostWindows(html);
  const windowFor = (id: string): HostWindow => windows.get(id) ?? ROOT_WINDOW;

  const videos: VideoElement[] = [];
  for (const video of parseVideoElements(html)) {
    const absolute = toAbsoluteWindow(video.start, video.end, windowFor(video.id));
    if (absolute) {
      videos.push(
        startAtPlayed({ ...video, start: absolute.start, end: absolute.end }, absolute.played),
      );
    }
  }

  const images: ImageElement[] = [];
  for (const image of parseImageElements(html)) {
    const absolute = toAbsoluteWindow(image.start, image.end, windowFor(image.id));
    if (absolute) images.push({ ...image, start: absolute.start, end: absolute.end });
  }

  // A <video data-has-audio> track is reported as "<renderId>-audio"; strip the
  // suffix to look the element's host window back up.
  const audios: AudioElement[] = [];
  for (const audio of parseAudioElements(html)) {
    const elementId = audio.type === "video" ? audio.id.replace(/-audio$/, "") : audio.id;
    // The mixer reads end === 0 as "run to the natural media length", so an
    // unbounded track must stay unbounded rather than collapse onto its start.
    const authoredEnd = audio.end > 0 ? audio.end : Infinity;
    const absolute = toAbsoluteWindow(audio.start, authoredEnd, windowFor(elementId));
    if (!absolute) continue;
    audios.push(
      startAtPlayed(
        { ...audio, start: absolute.start, end: Number.isFinite(absolute.end) ? absolute.end : 0 },
        absolute.played,
      ),
    );
  }

  return { videos, audios, images };
}
