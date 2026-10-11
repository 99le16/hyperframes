/* oxlint-disable */ // house/: example and engine code kept as shipped in production
// node preview.mjs t1 t2 ... -> work/pv${process.env.COMP ? '_' + process.env.COMP : ''}_<t>.png (fast seek preview of comp/index.html; not the final renderer)
import { createRequire } from 'module'; import fs0 from 'fs';
const PUP = process.env.PUPPETEER_PATH || 'puppeteer';
const puppeteer = (await import(PUP)).default;
import path from 'path';
const ts = process.argv.slice(2).map(Number);
const b = await puppeteer.launch({ headless: true, args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage(); await p.setViewport({ width: +(process.env.VW || 1080), height: +(process.env.VH || 1920) });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + path.resolve((process.env.COMP || 'comp') + '/index.html'), { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready);
for (const t of ts) {
  await p.evaluate(async (t) => {
    const vs = [...document.querySelectorAll('video')];
    await Promise.all(vs.map((v) => new Promise((res) => {
      const s = +v.dataset.start, d = +v.dataset.duration, m = +(v.dataset.mediaStart || 0);
      const on = t >= s && t < s + d; v.style.visibility = on ? 'visible' : 'hidden';
      if (!on) return res(); const ct = m + (t - s);
      if (Math.abs(v.currentTime - ct) < 0.001 && v.readyState >= 2) return res();
      v.addEventListener('seeked', () => res(), { once: true }); v.currentTime = ct; setTimeout(res, 4000);
    })));
    window.E.tl.seek(t, false);
  }, t);
  await new Promise((r) => setTimeout(r, 150));
  await p.screenshot({ path: `work/pv${process.env.COMP ? '_' + process.env.COMP : ''}_${t}.png` });
}
if (errs.length) console.log('ERR', errs.slice(0, 5).join(' | '));
await b.close();
