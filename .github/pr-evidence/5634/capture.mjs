import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Run from the child worktree: node .github/pr-evidence/5634/capture.mjs <parent-worktree>.
const root = process.cwd();
const require = createRequire(resolve(root, "packages/cli/package.json"));
const { build } = require("esbuild");
const puppeteer = require("puppeteer-core");
const out = resolve(root, ".github/pr-evidence/5634");
await mkdir(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath:
    process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  for (const [label, worktree] of [
    ["before", resolve(process.argv[2])],
    ["after", root],
  ]) {
    const entry = resolve(worktree, "packages/core/src/beats/beatDetection.ts");
    const bundle = await build({
      stdin: {
        contents: `import { analyzeMusicFromBuffer } from ${JSON.stringify(entry)}; globalThis.analyze = analyzeMusicFromBuffer;`,
        resolveDir: worktree,
        loader: "ts",
      },
      bundle: true,
      platform: "browser",
      format: "iife",
      write: false,
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 620, deviceScaleFactor: 1 });
    await page.setContent('<main style="font:20px system-ui;padding:36px;color:#17202d"></main>');
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    const result = await page.evaluate(async (label) => {
      const rate = 22050;
      const samples = new Float32Array(30 * rate);
      const truth = Array.from({ length: 47 }, (_, i) => 0.4 + (i * 60) / 96);
      let state = 5;
      for (const t of truth) {
        const start = Math.round(t * rate);
        for (let i = 0; i < 0.06 * rate && start + i < samples.length; i++) {
          state = (state * 1103515245 + 12345) % 2147483648;
          samples[start + i] += 0.25 * ((state / 2147483648) * 2 - 1) * Math.exp(-i / rate / 0.015);
        }
      }
      for (let t = 0.4; t <= 29; t += (2.2 * 60) / 96) {
        const start = Math.round(t * rate);
        for (let i = 0; i < 0.9 * rate && start + i < samples.length; i++) {
          const since = i / rate;
          samples[start + i] +=
            0.3 *
            [110, 138.6, 164.8].reduce((a, hz) => a + Math.sin(2 * Math.PI * hz * since), 0) *
            Math.exp(-since / 0.25);
        }
      }
      const audio = new AudioBuffer({
        length: samples.length,
        sampleRate: rate,
        numberOfChannels: 1,
      });
      audio.copyToChannel(samples, 0);
      const analysis = await globalThis.analyze(audio);
      const reference = truth.slice(2, -2);
      const recall =
        reference.filter((t) => analysis.beatTimes.some((b) => Math.abs(t - b) <= 0.07)).length /
        reference.length;
      const markers = (times, y, color) =>
        times
          .filter((t) => t >= 2 && t <= 12)
          .map(
            (t) =>
              `<line x1="${80 + (t - 2) * 106}" x2="${80 + (t - 2) * 106}" y1="${y}" y2="${y + 55}" stroke="${color}" stroke-width="3"/>`,
          )
          .join("");
      const ticks = Array.from(
        { length: 11 },
        (_, i) => `<text x="${80 + i * 106}" y="250" font-size="16">${i + 2}s</text>`,
      ).join("");
      document.querySelector("main").innerHTML =
        `<h1>${label === "before" ? "Before: Chrome analyzer" : "After: TypeScript tracker"}</h1><p>Actual browser analyzer output · synthetic 96 BPM clicks with loud stabs every 2.2 beats</p><p>Tempo: <b>${analysis.bpm} BPM</b> · beats: <b>${analysis.beatTimes.length}</b> · recall within ±70 ms: <b>${(recall * 100).toFixed(1)}%</b></p><svg width="1180" height="280"><text x="0" y="25">Known click grid</text>${markers(truth, 40, "#237c56")}<text x="0" y="135">Analyzer beat positions</text>${markers(analysis.beatTimes, 150, "#345ac0")}${ticks}</svg><p style="font-size:16px">Browser harness, not the Studio UI. Same deterministic audio in both runs; no mocked analyzer or provider.</p>`;
      return {
        label,
        sampleRate: rate,
        duration: 30,
        bpm: analysis.bpm,
        confidence: analysis.bpmConfidence,
        beatTimes: analysis.beatTimes,
        truth,
        recall,
      };
    }, label);
    await writeFile(resolve(out, `${label}.json`), JSON.stringify(result, null, 2) + "\n");
    await page.screenshot({ path: resolve(out, `${label}.png`) });
    console.log(label, result.bpm, result.recall);
    await page.close();
  }
} finally {
  await browser.close();
}
