// node probe.mjs <dir> W H -> {media: window.__mediaReq, errs}; also writes <dir>/sfx.json
import fs from 'fs'; import path from 'path';
const PUP = process.env.PUPPETEER_PATH || 'puppeteer';
const puppeteer = (await import(PUP)).default;
const [dir, W, H] = [process.argv[2], +process.argv[3], +process.argv[4]];
const b = await puppeteer.launch({ headless: true, args: ['--allow-file-access-from-files'] });
const p = await b.newPage(); await p.setViewport({ width: W, height: H }); const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('file://' + path.resolve(dir, 'index.html'), { waitUntil: 'load' });
const r = await p.evaluate(() => ({ media: window.__mediaReq || [], sfx: window.__sfx || [], dur: window.HF.DUR }));
fs.writeFileSync(path.join(dir, 'sfx.json'), JSON.stringify({ sfx: r.sfx, dur: r.dur }));
console.log(JSON.stringify({ media: r.media, errs }));
await b.close();
