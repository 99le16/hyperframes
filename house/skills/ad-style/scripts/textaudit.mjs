/* oxlint-disable */ // house/: example and engine code kept as shipped in production
// node textaudit.mjs <compdir> W H -> every text element: first time visible, its rendered top/bottom (glyph box)
import fs0 from 'fs'; import path from 'path';
const PUP = process.env.PUPPETEER_PATH || 'puppeteer';
const puppeteer = (await import(PUP)).default;
const [dir, W, H] = [process.argv[2], +process.argv[3], +process.argv[4]];
const b = await puppeteer.launch({ headless: true, args: ['--allow-file-access-from-files'] });
const p = await b.newPage(); await p.setViewport({ width: W, height: H });
await p.goto('file://' + path.resolve(dir, 'index.html'), { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
const res = await p.evaluate(async () => {
  const out = {}; const D = window.HF.DUR;
  const els = [...document.querySelectorAll('#root .abs, #root .pill, #root .tw')].filter((e) => e.textContent.trim() && !e.closest('.card'));
  els.forEach((e, i) => (e.dataset.aid = i));
  for (let t = 0.05; t < D; t += 0.2) {
    window.E.tl.seek(t, false);
    for (const e of els) {
      const cs = getComputedStyle(e); let v = cs.visibility !== 'hidden' && +cs.opacity > 0.05; let a = e.parentElement;
      while (v && a && a.id !== 'root') { const c = getComputedStyle(a); if (c.visibility === 'hidden' || +c.opacity < 0.05) v = false; a = a.parentElement; }
      if (!v) continue;
      // glyph box via a range over the text (excludes line-height padding)
      const r = document.createRange(); r.selectNodeContents(e); const rects = [...r.getClientRects()].filter((q) => q.width > 2);
      if (!rects.length) continue;
      const top = Math.min(...rects.map((q) => q.top)), bot = Math.max(...rects.map((q) => q.bottom));
      const k = e.dataset.aid; const o = out[k] || (out[k] = { text: e.textContent.trim().slice(0, 28), t: +t.toFixed(2), top, bot, cls: e.className });
      o.top = Math.min(o.top, top); o.bot = Math.max(o.bot, bot);
    }
  }
  return Object.values(out).sort((a, b) => a.t - b.t);
});
for (const o of res) console.log(`${o.t.toFixed(2).padStart(6)}  top ${Math.round(o.top).toString().padStart(5)}  bot ${Math.round(o.bot).toString().padStart(5)}  ${o.cls.padEnd(18).slice(0,18)} ${o.text}`);
await b.close();
