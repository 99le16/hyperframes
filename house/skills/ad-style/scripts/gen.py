"""gen.py <project_dir> [V|S|H] — comp[_F]/index.html from lib/ + spec.js + media.json + project.json.
project.json: base, matte, voice, words (list or path; {w,s,e} or {text,start,end}), pieces [{t0,t1,fx,fy}], music, out."""
import json, os, shutil, subprocess, sys
P = os.path.abspath(sys.argv[1]); os.chdir(P); F = sys.argv[2] if len(sys.argv) > 2 else 'V'
W, H = {'V': (1080, 1920), 'S': (1080, 1080), 'H': (1920, 1080)}[F]; PILLY = {'V': 1277, 'S': 880, 'H': 905}[F]
cfg = json.load(open('project.json'))
if F != 'V': cfg.update(cfg.get('formats', {}).get(F, {}))   # per-format base / matte / pieces / media / out
words = cfg['words'] if isinstance(cfg['words'], list) else json.load(open(cfg['words']))
words = [{'w': (x.get('w') or x.get('text', '')).strip(), 's': float(x.get('s', x.get('start'))), 'e': float(x.get('e', x.get('end')))} for x in words]
VD = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', cfg['base']], capture_output=True, text=True).stdout)
out = 'comp' if F == 'V' else f'comp_{F}'; os.makedirs(out, exist_ok=True)
for f in os.listdir('lib'):
    if f.startswith('._'): continue
    s = f'lib/{f}'
    (shutil.copytree(s, f'{out}/{f}', dirs_exist_ok=True) if os.path.isdir(s) else shutil.copy(s, out))
links = {'cam.mp4': cfg['base'], 'cut.webm': cfg.get('matte') or '', 'gen': 'gen', 'cuts': 'cuts', 'seed': 'seed'}
for n, s in links.items():
    p = f'{out}/{n}'
    if os.path.lexists(p): os.remove(p)
    if s and os.path.exists(s): os.symlink(os.path.abspath(s), p)
shutil.copy('spec.js', f'{out}/spec.js')
mf = cfg.get('media', 'media.json'); media = json.load(open(mf)) if os.path.exists(mf) else []
mh = ''.join(f'<video id="{m["id"]}" src="{m["src"]}" data-start="{m["t"]}" data-duration="{m["d"]}" data-media-start="{m.get("mstart", 0)}" '
             f'data-track-index="{2 + i}" muted playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></video>\n' for i, m in enumerate(media))
hf = {'F': F, 'W': W, 'H': H, 'PILLY': PILLY, 'DUR': VD, 'words': words, 'pieces': cfg['pieces'], 'media': media}
html = f'''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="engine.css">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script></head>
<body><div id="root" data-composition-id="root" data-start="0" data-duration="{VD}" data-width="{W}" data-height="{H}" data-fps="25" style="width:{W}px;height:{H}px">
<div class="layer" id="camLayer" style="z-index:10"><div class="inner" id="camIn">
<video id="cam" src="cam.mp4" data-start="0" data-duration="{VD}" data-media-start="0" data-track-index="0" muted playsinline></video></div></div>
<div class="layer" id="cutLayer" style="z-index:30"><div class="inner" id="cutIn">
<video id="cut" src="cut.webm" data-start="0" data-duration="{VD}" data-media-start="0" data-track-index="1" muted playsinline></video></div></div>
<div id="mediaHold">{mh}</div>
<script>window.HF={json.dumps(hf, ensure_ascii=False)};</script>
<script src="engine.js"></script><script src="spec.js"></script>
<script>window.__timelines = window.__timelines || {{}}; window.__timelines["root"] = E.tl;</script>
</div></body></html>'''
open(f'{out}/index.html', 'w').write(html)
print(f'{P}/comp', VD, len(words), 'words')
