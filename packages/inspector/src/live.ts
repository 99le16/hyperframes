import { randomUUID } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { Sources, fingerprint } from "./sources";
import { mapInspection } from "./mapInspection";
import type { BundleScriptProvenance } from "../../core/src/compiler/htmlBundler";
import type { InspectRequest, RuntimeResponse, Snippet } from "./types";

const runtime = () => readFileSync(new URL("./inspection.js", import.meta.url), "utf8");
export function prepareLiveInspection(
  project: string,
  html: string,
  provenance: BundleScriptProvenance[],
  sourceVersion: string,
) {
  project = realpathSync(project);
  if (fingerprint(project) !== sourceVersion) throw new Error("source_changed_during_load");
  const generation = randomUUID();
  const sources = new Sources(project);
  const catalog = new Map<string, Snippet>();
  const setup = `window.__hfLiveInspection={generation:${JSON.stringify(generation)},project:${JSON.stringify(project)},cssRules:${JSON.stringify(sources.cssRules.map(({ id, selector }) => ({ id, selector })))}};`;
  const script = `${setup}\n${runtime()}`.replace(/<\/script/gi, "<\\/script");
  if (!/<head\b[^>]*>/i.test(html)) throw new Error("preview_head_missing");
  html = html.replace(/<head\b[^>]*>/i, (head) => `${head}<script>${script}</script>`);
  let map = sources.mapper(html, provenance);
  return {
    html,
    generation,
    finalizeDocument(servedHtml: string) {
      map = sources.mapper(servedHtml, provenance);
    },
    resolve(packet: { generation: string; request: InspectRequest; raw: RuntimeResponse }) {
      if (packet.generation !== generation || fingerprint(project) !== sourceVersion)
        throw new Error("stale_preview: reload before inspecting");
      const { request, raw } = packet;
      if (
        !Array.isArray(request?.targets) ||
        request.targets.length < 1 ||
        request.targets.length > 20 ||
        !Array.isArray(raw?.results) ||
        raw.results.length !== request.targets.length
      )
        throw new Error("invalid_live_query");
      // The live path never seeks or silently switches to a different page.
      if (request.time !== undefined) throw new Error("live_query_does_not_seek");
      const result = mapInspection(
        raw,
        { targets: request.targets, maxBytes: 12000 },
        {
          sources,
          map,
          catalog,
          generation,
          sourceVersion,
          reused: true,
          start: performance.now(),
        },
      );
      if (fingerprint(project) !== sourceVersion) throw new Error("source_changed_during_query");
      return result;
    },
  };
}
export { fingerprint } from "./sources";
