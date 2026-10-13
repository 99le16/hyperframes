import type {
  TimelineEvent,
  TimelineRequest,
  TimelineRuntimeResult,
} from "../../core/src/runtime/timelineInspection";
import type { RuntimeQuery, RuntimeResponse } from "./types";

/**
 * Runs a function inside the inspected document: Puppeteer's page for headless inspection, the host's preview frame
 * for live inspection. `fn` crosses into the page as source text, so it may not refer to anything outside its body.
 */
export interface PageRunner {
  run<A, R>(fn: (arg: A) => R, arg: A): Promise<R>;
}

export interface PageTimeline extends TimelineRuntimeResult {
  /** At a boundary: for each animation crossing it, the next one on the same target and property. */
  following: TimelineEvent[];
}

type InspectedWindow = Window & {
  __hfInspection?: {
    query(query: RuntimeQuery): RuntimeResponse;
    timeline(request: TimelineRequest): TimelineRuntimeResult;
  };
  __hfLiveInspection?: { generation: string; project: string };
  __player?: {
    renderSeek(time: number, options: { exact: boolean }): void;
    getTime(): number;
    getDuration(): number;
  };
};

export interface PlayerState {
  time: number | undefined;
  duration: number | undefined;
}

/** Moves the player, so only a page the inspector owns may run it, never a person's preview. */
export function seekPage(time: number): void {
  const player = (window as InspectedWindow).__player;
  if (!player) throw new Error("player_unavailable");
  player.renderSeek(time, { exact: true });
}

export function playerStatePage(): PlayerState {
  const player = (window as InspectedWindow).__player;
  return { time: player?.getTime(), duration: player?.getDuration() };
}

export function queryPage(query: RuntimeQuery): RuntimeResponse {
  const inspection = (window as InspectedWindow).__hfInspection;
  if (!inspection) throw new Error("inspector_unavailable");
  return inspection.query(query);
}

export function timelinePage(request: TimelineRequest): PageTimeline {
  const inspection = (window as InspectedWindow).__hfInspection;
  if (!inspection) throw new Error("inspector_unavailable");
  const result = inspection.timeline(request);
  const following: TimelineEvent[] = [];
  if (request.boundary === undefined) return { ...result, following };
  const boundary = request.boundary;
  const schedule = inspection.timeline({ ...request, boundary: undefined });
  for (const crossing of result.events) {
    if (crossing.kind !== "animation" || crossing.relation !== "crosses") continue;
    for (const target of crossing.targets) {
      const next = schedule.events
        .filter(
          (event) =>
            event.kind === "animation" &&
            event.start > boundary &&
            event.targets.some((t) => t.ref === target.ref) &&
            event.properties.some((p) => crossing.properties.includes(p)),
        )
        .sort((a, b) => a.start - b.start)[0];
      if (next && !following.includes(next)) following.push(next);
    }
  }
  return { ...result, following };
}

/** The generation stamped into a live preview when its document was prepared, or null in any other page. */
export function liveGenerationPage(): string | null {
  return (window as InspectedWindow).__hfLiveInspection?.generation ?? null;
}
