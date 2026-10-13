import { createElementMap } from "./elementMap.js";
import { mapInspection } from "./mapInspection";
import type {
  TimelineRequest,
  TimelineRuntimeResult,
} from "../../core/src/runtime/timelineInspection";
import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  openSync,
  readFileSync,
  realpathSync,
  readdirSync,
} from "node:fs";
import { resolve, join, extname, sep } from "node:path";
import { homedir } from "node:os";
import { getHyperframeRuntimeScript } from "../../core/src/generated/runtime-inline";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import {
  bundleToSingleHtml,
  type BundleScriptProvenance,
} from "../../core/src/compiler/htmlBundler";
import { Sources, fingerprint } from "./sources";
import type { InspectRequest, RuntimeQuery, RuntimeResponse, Snippet } from "./types";

interface Session {
  page: Page;
  server: Server;
  generation: string;
  fingerprint: string;
  sources: Sources;
  map: ReturnType<Sources["mapper"]>;
  openMs: number;
}
export interface InspectorOptions {
  executablePath?: string;
  idleMs?: number;
  instrument?: boolean;
}
function chromePath() {
  if (process.env.HF_INSPECT_CHROME) return process.env.HF_INSPECT_CHROME;
  const root = join(homedir(), ".cache/hyperframes/chrome/chrome-headless-shell");
  if (existsSync(root))
    for (const version of readdirSync(root).sort().reverse()) {
      const dir = join(root, version);
      for (const platform of readdirSync(dir)) {
        const file = join(
          dir,
          platform,
          process.platform === "win32" ? "chrome-headless-shell.exe" : "chrome-headless-shell",
        );
        if (existsSync(file)) return file;
      }
    }
  throw new Error(
    "Set HF_INSPECT_CHROME to an installed Chrome executable; inspection does not download a browser.",
  );
}
export class Inspector {
  private session?: Session;
  private browser?: Browser;
  private tail: Promise<unknown> = Promise.resolve();
  private timer?: ReturnType<typeof setTimeout>;
  private closed = false;
  private catalog = new Map<string, Snippet>();
  readonly project: string;
  readonly stats = { browserStarts: 0, pageLoads: 0, queries: 0, seeks: 0 };
  constructor(
    project: string,
    readonly options: InspectorOptions = {},
  ) {
    this.project = realpathSync(project);
  }
  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.tail.then(operation);
    this.tail = result.catch(() => {});
    return result;
  }
  private async closeSession() {
    const session = this.session;
    this.session = undefined;
    this.catalog.clear();
    if (session) {
      await session.page.close().catch(() => {});
      await new Promise<void>((done) => session.server.close(() => done()));
      session.server.removeAllListeners("request");
    }
  }
  private async ensure(): Promise<{ session: Session; reused: boolean }> {
    const digest = fingerprint(this.project);
    if (this.session?.fingerprint === digest) return { session: this.session, reused: true };
    await this.closeSession();
    const start = performance.now();
    const generation = randomUUID();
    const provenance: BundleScriptProvenance[] = [];
    const sources = new Sources(this.project);
    const html = await bundleToSingleHtml(this.project, {
      runtime: "placeholder",
      scriptProvenance: (p) => provenance.push(p),
    });
    if (fingerprint(this.project) !== digest)
      throw new Error("source_changed_during_load: retry against a stable project");
    const server = createServer((req, res) => {
      try {
        const path = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
        if (path === "/" || path === "/index.html") {
          res.setHeader("Content-Type", "text/html");
          res.end(
            html.replace(
              'data-hyperframes-preview-runtime="1" src=""',
              'data-hyperframes-preview-runtime="1" src="/__hf-runtime.js"',
            ),
          );
          return;
        }
        if (path === "/__hf-runtime.js") {
          res.setHeader("Content-Type", "text/javascript");
          res.end(getHyperframeRuntimeScript());
          return;
        }
        const file = realpathSync(resolve(this.project, `.${path}`));
        if (!file.startsWith(this.project + sep)) {
          res.writeHead(404).end();
          return;
        }
        const fd = openSync(file, constants.O_RDONLY | constants.O_NOFOLLOW);
        try {
          if (!fstatSync(fd).isFile()) {
            res.writeHead(404).end();
            return;
          }
          const types: Record<string, string> = {
            ".js": "text/javascript",
            ".mjs": "text/javascript",
            ".css": "text/css",
            ".svg": "image/svg+xml",
            ".woff2": "font/woff2",
            ".png": "image/png",
            ".wav": "audio/wav",
            ".mp3": "audio/mpeg",
          };
          res.setHeader("Content-Type", types[extname(file)] ?? "application/octet-stream");
          res.end(readFileSync(fd));
        } finally {
          closeSync(fd);
        }
      } catch {
        res.writeHead(404).end();
      }
    });
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("preview address unavailable");
    let page: Page | undefined;
    try {
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          executablePath: this.options.executablePath ?? chromePath(),
          headless: true,
          args: [
            "--disable-dev-shm-usage",
            "--enable-webgl",
            "--use-gl=angle",
            "--use-angle=swiftshader",
          ],
        });
        this.stats.browserStarts++;
      }
      page = await this.browser.newPage();
      await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
      if (this.options.instrument !== false) {
        await page.evaluateOnNewDocument(
          "window.__hfLiveInspection = " +
            JSON.stringify({ generation }) +
            ";\n" +
            readFileSync(new URL("../dist/inspection.js", import.meta.url), "utf8"),
        );
      }
      await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: "load", timeout: 30_000 });
      await page.waitForFunction("!!window.__renderReady", { timeout: 15_000 });
      await page.evaluate(() => document.fonts.ready);
      this.session = {
        page,
        server,
        generation,
        fingerprint: digest,
        sources,
        map: sources.mapper(html, provenance),
        openMs: performance.now() - start,
      };
      this.stats.pageLoads++;
      return { session: this.session, reused: false };
    } catch (error) {
      await page?.close().catch(() => {});
      await new Promise<void>((done) => server.close(() => done()));
      server.removeAllListeners("request");
      throw error;
    }
  }
  private idle() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      void this.serialize(async () => {
        await this.closeSession();
        await this.browser?.close();
        this.browser = undefined;
      });
    }, this.options.idleMs ?? 120_000);
    this.timer.unref();
  }
  async inspect(request: InspectRequest) {
    return this.serialize(async () => {
      if (this.closed) throw new Error("inspector_disposed");
      clearTimeout(this.timer);
      try {
        return await this.query(request);
      } finally {
        this.idle();
      }
    });
  }
  private async query(request: InspectRequest) {
    if (
      !Array.isArray(request.targets) ||
      request.targets.length > 20 ||
      (!request.targets.length && !request.snippets?.length)
    )
      throw new Error("Provide 1–20 targets, or snippet IDs from a previous query.");
    for (const target of request.targets) {
      if (!target || typeof target !== "object") throw new Error("Invalid target");
      const keys = ["selector", "hfId", "ref"].filter((key) => key in target);
      if (
        keys.length !== 1 ||
        Object.values(target).some(
          (value) => typeof value !== "string" || !value || value.length > 1000,
        )
      )
        throw new Error("Each target needs exactly one selector, hfId or ref; within is optional.");
    }
    const maxBytes = request.maxBytes ?? 12_000;
    if (!Number.isInteger(maxBytes) || maxBytes < 2048 || maxBytes > 256_000)
      throw new Error("maxBytes must be 2048–256000");
    if (request.time != null && (!Number.isFinite(request.time) || request.time < 0))
      throw new Error("time must be a finite non-negative number");
    const start = performance.now();
    const { session, reused } = await this.ensure();
    if (request.generation && request.generation !== session.generation)
      throw new Error(
        "stale_generation: query targets again after source changes or idle disposal",
      );
    if (request.snippets?.length && !request.generation)
      throw new Error("snippet continuation requires generation");
    if (request.time != null) {
      await session.page.evaluate((time) => {
        const win = window as Window & {
          __player?: { renderSeek: (t: number, options: { exact: boolean }) => void };
        };
        if (!win.__player) throw new Error("player_unavailable");
        win.__player.renderSeek(time, { exact: true });
      }, request.time);
      this.stats.seeks++;
    }
    const visualState =
      request.time == null
        ? undefined
        : await session.page.evaluate(() => {
            const win = window as Window & {
              __player?: { getTime: () => number; getDuration: () => number };
            };
            return { time: win.__player?.getTime(), duration: win.__player?.getDuration() };
          });
    const query: RuntimeQuery = {
      targets: request.targets,
      descendants: request.descendants ?? true,
      cssRules: session.sources.cssRules.map(({ id, selector }) => ({ id, selector })),
    };
    const raw = await session.page.evaluate((q) => {
      const win = window as Window & {
        __hfInspection?: { query: (query: RuntimeQuery) => RuntimeResponse };
      };
      if (!win.__hfInspection) throw new Error("inspector_unavailable");
      return win.__hfInspection.query(q);
    }, query);
    if (fingerprint(this.project) !== session.fingerprint) {
      await this.closeSession();
      throw new Error("source_changed_during_query: retry");
    }
    this.stats.queries++;
    return mapInspection(raw, request, {
      sources: session.sources,
      map: session.map,
      catalog: this.catalog,
      generation: session.generation,
      sourceVersion: session.fingerprint,
      reused,
      start,
      visualState,
    });
  }
  async timeline(request: TimelineRequest) {
    if (!request || typeof request !== "object" || Array.isArray(request))
      throw new Error("Expected query object");
    if (
      Object.keys(request).some(
        (k) => !["component", "at", "range", "boundary", "generation", "offset"].includes(k),
      )
    )
      throw new Error("Unknown timeline query parameter");
    const times = [request.at, request.range, request.boundary].filter((v) => v !== undefined);
    if (times.length > 1) throw new Error("at, range and boundary are mutually exclusive");
    const numbers = [
      request.at,
      request.boundary,
      ...(Array.isArray(request.range) ? request.range : []),
    ].filter((v) => v !== undefined);
    if (numbers.some((v) => typeof v !== "number" || !Number.isFinite(v) || v < 0))
      throw new Error("Times must be finite non-negative seconds");
    if (
      request.range !== undefined &&
      (!Array.isArray(request.range) ||
        request.range.length !== 2 ||
        request.range[0] >= request.range[1])
    )
      throw new Error("range must be [start,end] with start < end");
    if (request.component) {
      const c = request.component;
      if (
        typeof c !== "object" ||
        Object.keys(c).some((k) => !["selector", "hfId", "ref", "within"].includes(k)) ||
        ["selector", "hfId", "ref"].filter((k) => k in c).length !== 1 ||
        Object.values(c).some((v) => typeof v !== "string" || !v)
      )
        throw new Error("component requires one selector, hfId or ref");
    }
    const offset = request.offset ?? 0;
    if (!Number.isInteger(offset) || offset < 0)
      throw new Error("offset must be non-negative integer");
    return this.serialize(async () => {
      if (this.closed) throw new Error("inspector_disposed");
      clearTimeout(this.timer);
      try {
        const { session, reused } = await this.ensure();
        if (request.generation && request.generation !== session.generation)
          throw new Error("stale_generation: query again");
        if (offset && !request.generation) throw new Error("pagination requires generation");
        const raw = await session.page.evaluate((q) => {
          const w = window as Window & {
            __hfInspection?: { timeline: (q: TimelineRequest) => TimelineRuntimeResult };
          };
          if (!w.__hfInspection) throw new Error("inspector_unavailable");
          const result = w.__hfInspection.timeline(q);
          const following: TimelineRuntimeResult["events"] = [];
          if (q.boundary !== undefined) {
            const schedule = w.__hfInspection.timeline({ ...q, boundary: undefined });
            for (const crossing of result.events.filter(
              (e) => e.kind === "animation" && e.relation === "crosses",
            )) {
              for (const target of crossing.targets) {
                const next = schedule.events
                  .filter(
                    (e) =>
                      e.kind === "animation" &&
                      e.start > q.boundary! &&
                      e.targets.some((t) => t.ref === target.ref) &&
                      e.properties.some((p) => crossing.properties.includes(p)),
                  )
                  .sort((a, b) => a.start - b.start)[0];
                if (next && !following.includes(next)) following.push(next);
              }
            }
          }
          return { ...result, following };
        }, request);
        if (fingerprint(this.project) !== session.fingerprint) {
          await this.closeSession();
          throw new Error("source_changed_during_query");
        }
        const groups = new Map<string, typeof raw.events>();
        for (const event of raw.events) {
          const identity = event.targets
            .map((t) => t.id || t.hfId || `${t.composition}:${t.tag}:${t.classes.join(".")}`)
            .sort();
          const key =
            event.kind === "animation" && event.stack
              ? JSON.stringify([
                  event.stack,
                  event.component?.ref,
                  event.relation,
                  [...event.properties].sort(),
                  identity,
                ])
              : `unique:${groups.size}`;
          const members = groups.get(key) ?? [];
          members.push(event);
          groups.set(key, members);
        }
        const allGroups = [...groups.values()];
        const selectedGroups = allGroups.slice(offset, offset + 60);
        const selected = selectedGroups.flat();
        const lines = [
          `Timeline · global seconds · ${raw.status}`,
          `generation: ${session.generation}`,
        ];
        if (raw.status !== "found")
          lines.push(...raw.candidates.map((c) => `${c.ref} #${c.id} ${c.tag}`));
        if (request.boundary !== undefined)
          lines.push(
            `Boundary ${request.boundary}s: only actions crossing, starting, ending or instantaneous here. Later stagger members are excluded, not absent. Group spans do not imply simultaneous starts. Target labels T1, T2, ... identify the same element within this response, not DOM order.`,
          );
        const targetLabels = new Map<string, string>();
        const targetLabel = (ref: string) => {
          if (!targetLabels.has(ref)) targetLabels.set(ref, `T${targetLabels.size + 1}`);
          return targetLabels.get(ref)!;
        };
        let group = "";
        const events = selected.map((event, index) => ({
          ...event,
          stack: undefined,
          sources: (event.stack ? session.map(event.stack, index) : []).map((s) => ({
            file: s.file,
            line: s.startLine,
          })),
        }));
        for (const members of selectedGroups) {
          const first = members[0];
          const event = {
            ...first,
            start: Math.min(...members.map((e) => e.start)),
            end: Math.max(...members.map((e) => e.end)),
            targets: [
              ...new Map(members.flatMap((e) => e.targets).map((t) => [t.ref, t])).values(),
            ],
          };
          const index = 0;
          const sources = event.stack ? session.map(event.stack, index) : [];
          const owner = event.component;
          const label = owner?.id ? `#${owner.id}` : (owner?.composition ?? "unassigned");
          if (group !== label) {
            lines.push(`\n${label}${owner ? ` [${owner.ref}]` : ""}`);
            group = label;
          }
          const counts = new Map<string, number>();
          for (const target of event.targets) {
            const label = target.id
              ? `#${target.id}`
              : (target.hfId ??
                (target.classes.length ? `.${target.classes.join(".")}` : target.tag));
            counts.set(label, (counts.get(label) ?? 0) + 1);
          }
          const targets = [...counts].map(([label, count]) =>
            count > 1 ? `${label} ×${count}` : label,
          );
          lines.push(
            `  ${event.start.toFixed(4)}–${event.end.toFixed(4)}s ${event.relation} ${event.kind} ${targets.slice(0, 4).join(", ")}${targets.length > 4 ? ` (+${targets.length - 4} groups)` : ""} ${event.properties.join(",")}`,
          );
          if (event.kind === "animation")
            lines.push(
              `    ${sources.length ? sources.map((s) => `${s.file}:${s.startLine}`).join(", ") : "source unknown"}`,
            );
          if (request.boundary !== undefined && event.kind === "animation") {
            lines.push(`    targets: ${event.targets.map((t) => targetLabel(t.ref)).join(", ")}`);
            if (members.length > 1) {
              for (const member of members.slice(0, 8))
                lines.push(
                  `    ${member.targets.map((t) => targetLabel(t.ref)).join(", ")}: ${member.start.toFixed(4)}–${member.end.toFixed(4)}s ${member.relation}`,
                );
              if (members.length > 8)
                lines.push(
                  `    ${members.length - 8} more member intervals omitted; do not infer their exact timing from this span.`,
                );
            }
          }
          if (members.length > 1) {
            const durations = members.map((e) => e.end - e.start);
            const starts = [...new Set(members.map((e) => e.start))].sort((a, b) => a - b);
            const step = starts.length > 1 ? starts[1] - starts[0] : null;
            const regular =
              step !== null &&
              starts.every((t, i) => i === 0 || Math.abs(t - starts[i - 1] - step) < 1e-4);
            const uniform = durations.every((d) => Math.abs(d - durations[0]) < 1e-7);
            lines.push(
              `    ${members.length} events; span is not continuous activity; ${uniform ? `each ${durations[0].toFixed(4)}s` : "varying durations"}${regular ? `; approx. start spacing ${step.toFixed(4)}s` : "; irregular or simultaneous starts"}`,
            );
          }
        }
        if (raw.following.length) {
          lines.push(
            "\nFollowing actions (context only; these do NOT start at the queried boundary):",
          );
          for (const event of raw.following.slice(0, 16)) {
            const sources = event.stack ? session.map(event.stack, 0) : [];
            lines.push(
              `  ${event.targets.map((t) => targetLabel(t.ref)).join(", ")}: ${event.start.toFixed(4)}–${event.end.toFixed(4)}s ${event.properties.join(",")} ${sources.map((s) => `${s.file}:${s.startLine}`).join(", ")}`,
            );
            for (const prior of raw.events.filter(
              (e) =>
                e.kind === "animation" &&
                e.relation === "crosses" &&
                e.targets.some((t) => event.targets.some((n) => n.ref === t.ref)) &&
                e.properties.some((p) => event.properties.includes(p)),
            )) {
              const overlap = Math.min(prior.end, event.end) - Math.max(prior.start, event.start);
              lines.push(
                `    previous action ends ${prior.end.toFixed(4)}s; ${overlap > 1e-7 ? `overlap ${overlap.toFixed(4)}s` : Math.abs(prior.end - event.start) < 1e-7 ? "endpoint handoff: NO duration overlap on this target" : "NO duration overlap on this target"}.`,
              );
            }
          }
          if (raw.following.length > 16)
            lines.push(`  ${raw.following.length - 16} additional following actions omitted.`);
        }
        let associations = 0;
        for (let a = 0; a < events.length; a++)
          for (let b = a + 1; b < events.length; b++) {
            const left = events[a],
              right = events[b];
            if (left.kind !== "animation" || right.kind !== "animation") continue;
            if (left.end < right.start || right.end < left.start) continue;
            const shared = left.targets.some((t) => right.targets.some((r) => r.ref === t.ref));
            const properties = left.properties.filter((p) => right.properties.includes(p));
            if (shared && properties.length && associations++ < 8)
              lines.push(
                `Relation: ${left.start.toFixed(4)}–${left.end.toFixed(4)} and ${right.start.toFixed(4)}–${right.end.toFixed(4)} share targets and ${properties.join(",")}; ${left.start === left.end || right.start === right.end ? "instantaneous action touches or occurs inside the other interval" : Math.min(left.end, right.end) > Math.max(left.start, right.start) ? "intervals overlap" : "touch at an endpoint only, no positive-duration overlap"}; not necessarily an error.`,
              );
          }
        const nextOffset =
          offset + selectedGroups.length < allGroups.length ? offset + selectedGroups.length : null;
        if (nextOffset !== null)
          lines.push(`More groups: repeat with offset=${nextOffset} and generation.`);
        lines.push(...raw.warnings.map((w) => `Coverage: ${w}`));
        lines.push(
          "Observed DOM-target GSAP and explicit HF items only; callbacks/object tweens/unexecuted code are not inspected. Scheduled intervals do not establish visibility; no visual verification. at/range are half-open; boundary includes exact endpoints. No seek performed.",
        );
        this.stats.queries++;
        return {
          text: lines.join("\n"),
          generation: session.generation,
          reused,
          status: raw.status,
          candidates: raw.candidates,
          events,
          eventCount: raw.events.length,
          groupCount: allGroups.length,
          nextOffset,
          warnings: raw.warnings,
        };
      } finally {
        this.idle();
      }
    });
  }
  async elementMap() {
    return this.serialize(async () => {
      if (this.closed) throw new Error("inspector_disposed");
      clearTimeout(this.timer);
      if (!existsSync(join(this.project, "index.html"))) throw new Error("no-composition");
      const { session } = await this.ensure();
      try {
        const result = await createElementMap(session.page, { file: "index.html" });
        if (fingerprint(this.project) !== session.fingerprint) {
          await this.closeSession();
          throw new Error("source_changed_during_query: retry");
        }
        return { ...result, sourceVersion: session.fingerprint, generation: session.generation };
      } finally {
        this.idle();
      }
    });
  }
  /** Test/host diagnostics only; the agent tool does not expose arbitrary page execution. */
  async withPage<T>(fn: (page: Page) => Promise<T>) {
    return this.serialize(async () => {
      if (this.closed) throw new Error("inspector_disposed");
      clearTimeout(this.timer);
      const { session } = await this.ensure();
      try {
        return await fn(session.page);
      } finally {
        this.idle();
      }
    });
  }
  async dispose() {
    return this.serialize(async () => {
      this.closed = true;
      clearTimeout(this.timer);
      await this.closeSession();
      await this.browser?.close();
      this.browser = undefined;
    });
  }
}
