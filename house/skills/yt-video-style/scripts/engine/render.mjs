// render.mjs <ID> [--at 0.5,2,4] [--under still.png] [--strip a,b,n]   (no flag = full render → out/<ID>.mov ProRes 4444 alpha @30)
// Scenes: scenes/<ID>.js on lib/host.html. Stills → prev/<ID>_<t>.png (composited over --under when given).
import puppeteer from 'puppeteer-core';
import {spawn} from 'node:child_process';
import {mkdirSync, writeFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), id = args[0], flag = k => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; };
if (!id || !existsSync(path.join(HERE, 'scenes', id + '.js'))) throw new Error('no scene ' + id);
const FPS = 30;
const browser = await puppeteer.launch({executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true,
  args: ['--allow-file-access-from-files', '--disable-web-security', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--force-color-profile=srgb', '--hide-scrollbars']});
let code = 0;
try {
  const page = await browser.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.setViewport({width: 1920, height: 1080, deviceScaleFactor: 1});
  const url = pathToFileURL(path.join(HERE, 'lib', 'host.html')); url.searchParams.set('id', id);
  await page.goto(url.href, {waitUntil: 'load'});
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.fonts].map(f => f.load().catch(() => 0)));
    await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))); });
  await page.waitForFunction('window.__3dready === true', {timeout: 120000});
  const e3 = await page.evaluate(() => window.__3derr); if (e3) errs.push(e3);
  if (errs.length) throw new Error('page errors:\n' + errs.join('\n'));
  const {dur, meta, sfx, behind} = await page.evaluate(() => window.__meta());
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setDefaultBackgroundColorOverride', {color: {r: 0, g: 0, b: 0, a: 0}});
  const shot = async t => { await page.evaluate(t => window.__seek(t), t);
    const {data} = await cdp.send('Page.captureScreenshot', {format: 'png', optimizeForSpeed: true}); return Buffer.from(data, 'base64'); };
  if (args.includes('--meta')) { writeFileSync(path.join(HERE, 'out', id + '.sfx.json'), JSON.stringify(sfx || [])); await browser.close(); process.exit(0); }
  const at = flag('--at'), strip = flag('--strip');
  if (at || strip) {
    mkdirSync(path.join(HERE, 'prev'), {recursive: true});
    let ts = at ? at.split(',').map(Number) : (() => { const [a, b, n] = strip.split(',').map(Number); return [...Array(n)].map((_, i) => a + (b - a) * i / (n - 1)); })();
    const under = flag('--under');
    const lay = flag('--layer'); if (lay) await page.evaluate(l => document.body.classList.add('layer-' + l), lay);
    if (under) await page.evaluate(u => { document.body.style.background = `url("${u}") 0 0/1920px 1080px`; }, pathToFileURL(path.resolve(under)).href);
    for (const t of ts) {
      await page.evaluate(t => window.__seek(t), t);
      const f = path.join(HERE, 'prev', `${id}_${t.toFixed(2)}.png`);
      if (under) await page.screenshot({path: f}); else writeFileSync(f, await shot(t));
      console.log(f);
    }
  } else {
    const N = Math.round(dur * FPS);
    writeFileSync(path.join(HERE, 'out', id + '.json'), JSON.stringify({id, dur, frames: N, meta, behind}));
    writeFileSync(path.join(HERE, 'out', id + '.sfx.json'), JSON.stringify(sfx || []));
    const passes = behind ? [['behind', id + '_b.mov'], ['front', id + '.mov']] : [[null, id + '.mov']];
    for (const [layer, name] of passes) {
      await page.evaluate(l => { document.body.classList.remove('layer-behind', 'layer-front'); if (l) document.body.classList.add('layer-' + l); }, layer);
      const out = path.join(HERE, 'out', name);
      const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
        '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-vendor', 'apl0', '-r', String(FPS), out], {stdio: ['pipe', 'inherit', 'inherit']});
      const t0 = Date.now();
      for (let i = 0; i < N; i++) {
        const b = await shot(i / FPS);
        if (!ff.stdin.write(b)) await new Promise(r => ff.stdin.once('drain', r));
      }
      ff.stdin.end(); await new Promise(r => ff.on('close', c => { code = code || c; r(); }));
      console.log(`${name} ${N} frames ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  }
} catch (e) { console.error(e.message || e); code = 1; }
await browser.close(); process.exit(code);
