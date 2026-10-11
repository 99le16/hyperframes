/* oxlint-disable */ // house/: example and engine code kept as shipped in production
// dump window.__sfx from a composition -> <dir>/sfx.json
import { createRequire } from 'module'; import fs0 from 'fs';
const PUP = process.env.PUPPETEER_PATH || 'puppeteer';
const puppeteer = (await import(PUP)).default;
import fs from 'fs'; import path from 'path';
const dirs = process.argv.slice(2);
const b = await puppeteer.launch({ headless: true, args: ['--allow-file-access-from-files'] });
for (const d of dirs) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(d, 'index.html'), { waitUntil: 'load' });
  const s = await p.evaluate(() => ({ sfx: window.__sfx, dur: window.HF.DUR }));
  fs.writeFileSync(path.join(d, 'sfx.json'), JSON.stringify(s));
  console.log(d, s.sfx.length, 'cues', errs.length ? 'ERR ' + errs.join(' | ') : '');
  await p.close();
}
await b.close();
