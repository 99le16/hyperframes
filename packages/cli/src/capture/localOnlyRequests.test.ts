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
  return [server, `http://127.0.0.1:${(server.address() as AddressInfo).port}`];
}

describe("a --local-only page", () => {
  let foreign: Server;
  let foreignUrl: string;
  let foreignHits = 0;
  let project: Server;
  let projectUrl: string;
  let html = "";

  beforeAll(async () => {
    [foreign, foreignUrl] = await listen((_req, res) => {
      foreignHits++;
      res.writeHead(200, { "access-control-allow-origin": "*" }).end("FOREIGN TEXT");
    });
    html = `<!doctype html><html><body>
<div data-composition-id="main" data-width="320" data-height="180" data-duration="1"></div>
<script>window.__timelines={main:{duration:()=>1,seek:()=>{},pause:()=>{}}};
fetch("${foreignUrl}/secret").then((r)=>r.text()).then((t)=>{document.title=t},()=>{document.title="blocked"});</script>
</body></html>`;
    [project, projectUrl] = await listen((_req, res) => {
      res.writeHead(200, { "content-type": "text/html" }).end(html);
    });
  });

  afterAll(async () => {
    await new Promise((resolve) => foreign.close(resolve));
    await new Promise((resolve) => project.close(resolve));
  });

  async function pageTitle(localOnly: boolean): Promise<{ title: string; failed: string[] }> {
    const failed: string[] = [];
    const { browser, page } = await openSettledCompositionPage(html, `${projectUrl}/index.html`, {
      renderReadyTimeoutMs: 2_000,
      renderReadyWarningSuffix: "local-only test",
      browserGpuMode: "software",
      localOnly,
      beforeNavigate: (p) => {
        p.on("requestfailed", (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`));
      },
    });
    try {
      await page.waitForFunction(() => document.title !== "", { timeout: 10_000 });
      return { title: await page.title(), failed };
    } finally {
      await closeManagedBrowser(browser);
    }
  }

  it("cannot read another host", async () => {
    foreignHits = 0;
    const { title, failed } = await pageTitle(true);
    expect(title).toBe("blocked");
    expect(foreignHits).toBe(0);
    expect(failed).toEqual([`${foreignUrl}/secret net::ERR_BLOCKED_BY_CLIENT.Inspector`]);
  }, 60_000);

  it("reads it without the flag", async () => {
    foreignHits = 0;
    expect((await pageTitle(false)).title).toBe("FOREIGN TEXT");
    expect(foreignHits).toBe(1);
  }, 60_000);
});
