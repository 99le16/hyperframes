import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { readFileSync, realpathSync, statSync, existsSync, readdirSync } from "node:fs";
import { resolve, join, extname, sep } from "node:path";
import { homedir } from "node:os";
import { build } from "esbuild";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import {
  bundleToSingleHtml,
  type BundleScriptProvenance,
} from "../../core/src/compiler/htmlBundler";
import { Sources, fingerprint, mergeSnippets } from "./sources";
import type { InspectRequest, RuntimeQuery, RuntimeResponse, Snippet } from "./types";

const coverage = [
  "GSAP associations observed since page initialization; callback-created animations may require an explicit time query.",
  "CSS selector matches are candidates, not a full cascade or dependency graph. HTML is the authored opening tag when uniquely located.",
  "Direct constructors, other animation systems, iframe contents, removed animations and unexecuted paths may be absent; missing origins are reported.",
];
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
      scriptProvenance: (p) => provenance.push(p),
    });
    if (fingerprint(this.project) !== digest)
      throw new Error("source_changed_during_load: retry against a stable project");
    const server = createServer((req, res) => {
      try {
        const path = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
        if (path === "/" || path === "/index.html") {
          res.setHeader("Content-Type", "text/html");
          res.end(html);
          return;
        }
        const file = realpathSync(resolve(this.project, `.${path}`));
        if (!file.startsWith(this.project + sep) || !statSync(file).isFile()) {
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
        res.end(readFileSync(file));
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
        const runtime = await build({
          stdin: {
            contents: `import { installInspection } from ${JSON.stringify(resolve(import.meta.dirname, "../../core/src/runtime/inspection.ts"))}; installInspection(window, ${JSON.stringify(generation)});`,
            resolveDir: import.meta.dirname,
          },
          bundle: true,
          platform: "browser",
          format: "iife",
          write: false,
        });
        await page.evaluateOnNewDocument(runtime.outputFiles[0].text);
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
    const collected: Snippet[] = [];
    const results = raw.results.map((result, index) => {
      let unmappedAnimations = 0;
      for (const animation of result.animations) {
        const mapped = animation.stack ? session.map(animation.stack, index) : [];
        if (!mapped.length) unmappedAnimations++;
        collected.push(...mapped);
        for (const stack of animation.attachmentStacks)
          collected.push(
            ...session
              .map(stack, index)
              .map((snippet) => ({ ...snippet, kind: ["timeline attachment"] })),
          );
      }
      for (const el of result.elements) {
        const snippet = session.sources.markup(el, index);
        if (snippet) collected.push(snippet);
      }
      for (const id of result.css) {
        const rule = session.sources.cssRules.find((rule) => rule.id === id);
        if (rule) {
          const snippet = session.sources.slice(
            rule.file,
            rule.start,
            rule.end,
            "matched CSS candidate",
            index,
          );
          if (snippet) collected.push(snippet);
        }
      }
      return {
        target: index,
        status: result.status,
        candidates: result.candidates.slice(0, 5),
        candidatesOmitted: Math.max(0, result.candidates.length - 5),
        animations: result.animations.length,
        coTargets: [
          ...new Map(
            result.animations
              .flatMap((animation) => animation.targets)
              .filter((element) => !result.elements.some((own) => own.ref === element.ref))
              .map((element) => [element.ref, element]),
          ).values(),
        ].slice(0, 10),
        unmappedAnimations,
        scopeTruncated: result.truncated,
      };
    });
    const merged = mergeSnippets(collected, session.sources);
    for (const snippet of merged) this.catalog.set(snippet.id, snippet);
    let selected = merged;
    if (request.snippets)
      selected = request.snippets.map((id) => {
        const snippet = this.catalog.get(id);
        if (!snippet) throw new Error(`unknown_snippet: ${id}`);
        return snippet;
      });
    const response = {
      generation: session.generation,
      visualState,
      sourceVersion: session.fingerprint,
      reused,
      results,
      snippets: [] as Snippet[],
      omitted: [] as { id: string; bytes: number }[],
      omittedCount: 0,
      nextOffset: null as number | null,
      coverage,
      recordLimitReached: raw.recordLimitReached,
      hooked: raw.hooked,
      debugAvailable: true,
      elapsedMs: Math.round(performance.now() - start),
    };
    // Code blocks are atomic. A continuation repeats this query with generation and nextOffset.
    const offset = request.offset ?? 0;
    if (!Number.isInteger(offset) || offset < 0)
      throw new Error("offset must be a non-negative integer");
    for (let i = offset; i < selected.length; i++) {
      const snippet = selected[i];
      response.snippets.push(snippet);
      if (Buffer.byteLength(JSON.stringify(response)) > maxBytes - 700) {
        response.snippets.pop();
        response.omittedCount = selected.length - i;
        response.omitted = selected
          .slice(i, i + 8)
          .map((item) => ({ id: item.id, bytes: Buffer.byteLength(item.code) }));
        response.nextOffset = i;
        break;
      }
    }
    while (
      Buffer.byteLength(JSON.stringify(response)) > maxBytes &&
      response.results.some((r) => r.candidates.length)
    ) {
      const r = response.results.find((r) => r.candidates.length)!;
      r.candidates.pop();
      r.candidatesOmitted++;
    }
    if (Buffer.byteLength(JSON.stringify(response)) > maxBytes)
      throw new Error("metadata_exceeds_budget: use fewer targets or increase maxBytes");
    this.stats.queries++;
    if (request.debug) return { ...response, debug: raw };
    return response;
  }
  /** Test/host diagnostics only; the agent tool does not expose arbitrary page execution. */
  async withPage<T>(fn: (page: Page) => Promise<T>) {
    return this.serialize(async () => {
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
