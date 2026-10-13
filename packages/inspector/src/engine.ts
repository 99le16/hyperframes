import type { TimelineRequest } from "../../core/src/runtime/timelineInspection";
import { collectElementDom, formatElementMap, type ElementMap } from "./elementMap.js";
import { mapInspection } from "./mapInspection";
import { queryPage, timelinePage, type PageRunner } from "./pageQueries";
import type { Sources } from "./sources";
import { formatTimeline, type TimelineReport } from "./timelineReport";
import type { InspectRequest, Snippet } from "./types";

export interface SourceContext {
  sources: Sources;
  map: ReturnType<Sources["mapper"]>;
}

/** One loaded page of the project, whichever browser holds it. */
export interface InspectionView {
  readonly generation: string;
  readonly sourceVersion: string;
  /** The project's source index and the page's line mapping, built on first use. */
  sourceContext(): SourceContext;
  /** Rejects when the project's sources changed after the page loaded, so an answer never mixes two versions. */
  assertCurrent(): Promise<void>;
}

export type ComponentReport = ReturnType<typeof mapInspection>;
export type ElementMapReport = ElementMap & { sourceVersion: string; generation: string };

export async function inspectComponents(
  runner: PageRunner,
  view: InspectionView,
  request: InspectRequest,
  context: {
    catalog: Map<string, Snippet>;
    reused: boolean;
    start: number;
    visualState?: { time: number | undefined; duration: number | undefined };
  },
): Promise<ComponentReport> {
  const { sources, map } = view.sourceContext();
  const raw = await runner.run(queryPage, {
    targets: request.targets,
    descendants: request.descendants ?? true,
    cssRules: sources.cssRules.map(({ id, selector }) => ({ id, selector })),
  });
  await view.assertCurrent();
  return mapInspection(raw, request, {
    ...context,
    sources,
    map,
    generation: view.generation,
    sourceVersion: view.sourceVersion,
  });
}

export async function inspectTimeline(
  runner: PageRunner,
  view: InspectionView,
  request: TimelineRequest,
  reused: boolean,
): Promise<TimelineReport> {
  const raw = await runner.run(timelinePage, request);
  await view.assertCurrent();
  return formatTimeline(raw, request, {
    generation: view.generation,
    map: view.sourceContext().map,
    reused,
  });
}

export async function inspectElementMap(
  runner: PageRunner,
  view: InspectionView,
  file = "index.html",
): Promise<ElementMapReport> {
  const map = formatElementMap(await runner.run(collectElementDom, undefined), { file });
  await view.assertCurrent();
  return { ...map, sourceVersion: view.sourceVersion, generation: view.generation };
}

export type { PageRunner, TimelineReport };
