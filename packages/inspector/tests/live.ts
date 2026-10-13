import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import puppeteer from "puppeteer-core";
import { bundleToSingleHtml } from "../../core/src/compiler/htmlBundler";
// Built Node entry, exactly the import consumed by Desktop.
const entry = "../dist/live.js";
const { prepareLiveInspection, fingerprint }: typeof import("../src/live") = await import(entry);
const dir = mkdtempSync(join(tmpdir(), "hf-live-"));
const vendor = process.argv[2];
if (!vendor) throw new Error("Pass gsap.min.js");
const source = `<!doctype html><html><head><script src="gsap.min.js"></script><style>.title{color:red}</style></head><body><main data-composition-id="test" data-start="0" data-duration="10" data-width="1920" data-height="1080"><section id="a"><h1 class="title" id="title">One</h1></section><section id="b"><h1 class="title" id="other">Two</h1></section></main><script>
const title = document.querySelector('#title');
const other = document.querySelector('#other');
const tl=gsap.timeline({paused:true});
function move(el){tl.to(el,{x:80,duration:2},1);}
move(title);
move(other);
window.__timelines = window.__timelines || {}; window.__timelines.test = tl;
</script></body></html>`;
writeFileSync(join(dir, "index.html"), source);
writeFileSync(join(dir, "gsap.min.js"), readFileSync(vendor));
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
let server: ReturnType<typeof createServer> | undefined;
try {
  const version = fingerprint(dir),
    provenance: import("../../core/src/compiler/htmlBundler").BundleScriptProvenance[] = [];
  const bundled = await bundleToSingleHtml(dir, {
    runtime: "inline",
    scriptProvenance: (p) => provenance.push(p),
  });
  const live = prepareLiveInspection(dir, bundled, provenance, version);
  // Studio adds scripts after the bundler. Map the final served document, not its earlier offsets.
  const served = live.html.replace(
    "<head>",
    '<head>\n<meta name="studio-fixture" content="extra-lines">\n',
  );
  live.finalizeDocument(served);
  server = createServer((req, res) => {
    res.setHeader(
      "Content-Type",
      req.url?.endsWith("/gsap.min.js") ? "text/javascript" : "text/html",
    );
    res.end(req.url?.endsWith("/gsap.min.js") ? readFileSync(vendor) : served);
  });
  await new Promise<void>((r) => server!.listen(0, "127.0.0.1", r));
  browser = await puppeteer.launch({
    executablePath:
      process.env.HF_INSPECT_CHROME ??
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto(
    `http://127.0.0.1:${(server.address() as import("node:net").AddressInfo).port}/api/projects/test/preview`,
  );
  await page.waitForFunction("!!window.__hfInspection && !!window.__timelines?.test", {
    timeout: 3000,
  });
  const packet = await page.evaluate(() => {
    const w = window as any;
    const request = {
      targets: [
        { selector: "#title" },
        { selector: "#other" },
        { selector: ".title" },
        { selector: ".title", within: "#b" },
      ],
    };
    const before = w.__timelines.test.time();
    const raw = w.__hfInspection.query({
      ...request,
      descendants: true,
      cssRules: w.__hfLiveInspection.cssRules,
    });
    if (w.__timelines.test.time() !== before) throw new Error("inspection moved playhead");
    return { generation: w.__hfLiveInspection.generation, request, raw };
  });
  const result = live.resolve(packet);
  assert.deepEqual(
    result.results.map((r) => r.status),
    ["found", "found", "ambiguous", "found"],
  );
  assert.equal(result.results[0].unmappedAnimations, 0);
  assert(
    result.snippets.some(
      (s) => s.code.includes("function move") && s.targets.includes(0) && s.targets.includes(1),
    ),
  );
  for (const s of result.snippets)
    assert.equal(
      s.code,
      readFileSync(join(dir, s.file), "utf8")
        .split(/(?<=\n)/)
        .slice(s.startLine - 1, s.endLine)
        .join(""),
    );
  assert.throws(() => live.resolve({ ...packet, generation: "old" }), /stale_preview/);
  assert.throws(
    () => live.resolve({ ...packet, request: { ...packet.request, time: 3 } }),
    /does_not_seek/,
  );
  writeFileSync(join(dir, "index.html"), source + "\n");
  assert.throws(() => live.resolve(packet), /stale_preview/);
  assert.equal((await browser.pages()).length, 2); // initial blank + the one host preview
  console.log(
    "PASS live preview: multi-target, source lines, variable/shared helper mapping, ambiguity, no seek, stale generation/source, one host page",
  );
} finally {
  await browser?.close();
  if (server) await new Promise<void>((r) => server!.close(() => r()));
  rmSync(dir, { recursive: true, force: true });
}
