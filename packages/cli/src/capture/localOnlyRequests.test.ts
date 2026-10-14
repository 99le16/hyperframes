import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeManagedBrowser } from "../browser/launch.js";
import { openSettledCompositionPage } from "./captureCompositionFrame.js";
import { allowedLocalOnlyRequest } from "./localOnlyRequests.js";

describe("allowedLocalOnlyRequest", () => {
  const server = "http://127.0.0.1:4100/index.html";
  it.each([
    ["http://127.0.0.1:4100/assets/a.png", true],
    ["data:image/png;base64,AAAA", true],
    ["blob:http://127.0.0.1:4100/1234", true],
    ["https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js", true],
    ["https://fonts.googleapis.com/css2?family=Inter", true],
    ["https://fonts.gstatic.com/s/inter/v13/a.woff2", true],
    ["http://127.0.0.1:4101/secret", false],
    ["https://example.com/", false],
    ["https://cdn.jsdelivr.net/gh/someone/repo/payload.txt", false],
    ["https://cdn.jsdelivr.net/npm/gsap-extra/index.js", false],
    ["https://fonts.googleapis.com.example.com/x", false],
  ])("%s -> %s", (url, allowed) => {
    expect(allowedLocalOnlyRequest(url, server)).toBe(allowed);
  });
});

async function listen(handler: Parameters<typeof createServer>[1]): Promise<[Server, string]> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return [server, `127.0.0.1:${(server.address() as AddressInfo).port}`];
}

// Each probe sets document.title once its attempt settled, either way.
const PROBES: Record<string, string> = {
  fetch: `fetch("http://FOREIGN/x").then((r) => r.text()).then((t) => { document.title = t; }, () => { document.title = "blocked"; });`,
  "shared worker": `const w = new SharedWorker("/shared.js"); w.port.onmessage = (e) => { document.title = e.data; };`,
  "service worker": `navigator.serviceWorker.register("/sw.js").then((reg) => {
    const w = reg.installing; w.onstatechange = () => { if (w.state !== "installing") document.title = w.state; };
  }, () => { document.title = "refused"; });`,
  websocket: `const ws = new WebSocket("ws://FOREIGN/"); ws.onopen = ws.onerror = () => { document.title = "settled"; };`,
  popup: `window.open("http://FOREIGN/popup"); document.title = "opened";`,
};

const SCRIPTS: Record<string, string> = {
  "/shared.js": `onconnect = (e) => { const port = e.ports[0];
    fetch("http://FOREIGN/shared").then((r) => r.text()).then((t) => port.postMessage(t), () => port.postMessage("blocked")); };`,
  "/sw.js": `self.oninstall = (e) => e.waitUntil(fetch("http://FOREIGN/sw").then((r) => r.text()));`,
};

describe("a --local-only browser", () => {
  let foreign: Server;
  let foreignHost: string;
  let foreignHits = 0;
  let project: Server;
  let projectHost: string;
  let probe = "";
  const html = () => `<!doctype html><html><body>
<div data-composition-id="main" data-width="320" data-height="180" data-duration="1"></div>
<script>window.__timelines={main:{duration:()=>1,seek:()=>{},pause:()=>{}}};
${PROBES[probe]!.replaceAll("FOREIGN", foreignHost)}</script></body></html>`;

  beforeAll(async () => {
    [foreign, foreignHost] = await listen((_req, res) => {
      foreignHits++;
      res.writeHead(200, { "access-control-allow-origin": "*" }).end("FOREIGN TEXT");
    });
    foreign.on("upgrade", (_req, socket) => {
      foreignHits++;
      socket.destroy();
    });
    [project, projectHost] = await listen((req, res) => {
      const script = SCRIPTS[req.url ?? ""];
      if (script) {
        res.writeHead(200, { "content-type": "text/javascript" });
        res.end(script.replaceAll("FOREIGN", foreignHost));
        return;
      }
      res.writeHead(200, { "content-type": "text/html" }).end(html());
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => foreign.close(resolve));
    await new Promise((resolve) => project.close(resolve));
  });

  async function run(
    name: string,
    localOnly: boolean,
  ): Promise<{ title: string; failed: string[] }> {
    probe = name;
    foreignHits = 0;
    const failed: string[] = [];
    let popupSettled: Promise<unknown> = Promise.resolve();
    const { browser, page } = await openSettledCompositionPage(html(), `http://${projectHost}/`, {
      renderReadyTimeoutMs: 2_000,
      renderReadyWarningSuffix: "local-only test",
      browserGpuMode: "software",
      localOnly,
      beforeNavigate: (p) => {
        p.on("requestfailed", (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`));
        p.on("popup", (popup) => {
          popupSettled =
            popup
              ?.waitForFunction(() => document.readyState === "complete", { timeout: 10_000 })
              .catch(() => undefined) ?? Promise.resolve();
        });
      },
    });
    try {
      await page.waitForFunction(() => document.title !== "", { timeout: 10_000 });
      await popupSettled;
      return { title: await page.title(), failed };
    } finally {
      await closeManagedBrowser(browser);
    }
  }

  it("reports a blocked page request as a blocked load", async () => {
    const { title, failed } = await run("fetch", true);
    expect(title).toBe("blocked");
    expect(failed).toEqual([`http://${foreignHost}/x net::ERR_BLOCKED_BY_CLIENT.Inspector`]);
  }, 60_000);

  it.each(Object.keys(PROBES))(
    "keeps a %s from reaching another host",
    async (name) => {
      await run(name, true);
      expect(foreignHits).toBe(0);
    },
    60_000,
  );

  it.each(Object.keys(PROBES))(
    "lets a %s reach it without the flag",
    async (name) => {
      await run(name, false);
      expect(foreignHits).toBeGreaterThan(0);
    },
    60_000,
  );
});
