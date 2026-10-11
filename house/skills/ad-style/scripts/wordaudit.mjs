// node wordaudit.mjs <compdir> W H -> every spoken word that is NOT readable on screen shortly after it is said
// (visible text = text nodes whose element chain is visible; matched without spaces/punctuation/accents)
import path from 'path';
const PUP = process.env.PUPPETEER_PATH || 'puppeteer';
const puppeteer = (await import(PUP)).default;
const [dir, W, H] = [process.argv[2], +process.argv[3], +process.argv[4]];
const b = await puppeteer.launch({ headless: true, protocolTimeout: 900000, args: ['--allow-file-access-from-files'] });
const p = await b.newPage(); await p.setViewport({ width: W, height: H });
await p.goto('file://' + path.resolve(dir, 'index.html'), { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
const res = await p.evaluate(() => {
  const N = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s¿?¡!.,:;"«»()]/g, '').replace(/ /g, '');
  const vis = (e) => { for (let a = e; a && a.id !== 'root'; a = a.parentElement) { const c = getComputedStyle(a); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) return false; } return true; };
  const tl = window.E.tlRaw || window.E.tl; const root = document.getElementById('root');
  const screen = (t) => { tl.seek(t, false); let s = ''; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n; (n = w.nextNode());) { if (n.parentElement.closest('script')) continue; if (n.textContent.trim() && vis(n.parentElement)) s += n.textContent; } return N(s); };
  const bad = [];
  const SYN = { un: ['1'], una: ['1'], uno: ['1'], dos: ['2'], tres: ['3'], cuatro: ['4'], cinco: ['5'], diez: ['10'], doce: ['12'], quince: ['15'],
    euros: ['€'], euro: ['€'], dolares: ['$'], mil: ['000'], porciento: ['%'] };
  for (const w of window.HF.words) {
    const k = N(w.w); if (!k) continue;
    const alt = [k].concat(SYN[k] || []);
    const a = screen(w.s + 0.1), c = screen(Math.max(w.s + 0.3, w.e));
    if (!alt.some((x) => a.includes(x) || c.includes(x))) bad.push({ w: w.w, s: w.s, e: w.e });
  }
  return bad;
});
if (process.argv[5] === 'json') console.log(JSON.stringify(res));
else console.log(res.length ? 'MISSING ' + res.map((w) => `${w.s.toFixed(2)} ${w.w}`).join(' | ') : 'ALL WORDS ON SCREEN');
await b.close();
