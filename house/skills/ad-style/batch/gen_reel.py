"""gen_reel.py <AD> <F> — comp/<AD>_<F>/index.html: engine + devices + modules, pieces from tanda10 ads/<AD>.json.
Two passes: pass 1 collects the Seedance / phone media the modules ask for (window.__mediaReq), pass 2 writes them as <video>s."""
import json, os, shutil, subprocess, sys
AD, F = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
T10 = os.path.abspath('../tanda10-reels/work')
W, H = {'V': (1080, 1920), 'S': (1080, 1080), 'H': (1920, 1080)}[F]; PILLY = {'V': 1277, 'S': 880, 'H': 905}[F]
d = json.load(open(f'{T10}/ads/{AD}.json')); out = f'comp/{AD}_{F}'; os.makedirs(out, exist_ok=True)
for f in os.listdir('lib'):
    if f.startswith('._'): continue
    s = f'lib/{f}'; (shutil.copytree(s, f'{out}/{f}', dirs_exist_ok=True) if os.path.isdir(s) else shutil.copy(s, out))
for n, s in {'cam.mp4': f'{T10}/ads/{AD}_{F}.mp4', 'cut.webm': f'{T10}/ads/{AD}_{F}_cut.webm', 'gen': 'gen', 'cuts': 'cuts', 'seed': 'seed'}.items():
    p = f'{out}/{n}'
    if os.path.lexists(p): os.remove(p)
    os.symlink(os.path.abspath(s), p)
VD = d['dur']
pieces = d['pieces'][F]
def write(media):
    mh = ''.join(f'<video id="{m["id"]}" src="{m["src"]}" data-start="{m["t"]}" data-duration="{m["d"]}" data-media-start="{m.get("mstart", 0)}" '
                 f'data-track-index="{2 + i}" muted playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></video>\n' for i, m in enumerate(media))
    hp = f'{T10}/ads/{AD}_{F}.head.json'
    if not os.path.exists(hp): subprocess.run(['python3', 'headtrack.py', AD, F], check=True)
    hf = {'F': F, 'W': W, 'H': H, 'PILLY': PILLY, 'DUR': VD, 'words': d['words'], 'pieces': pieces, 'head': json.load(open(hp))}
    reel = ("(function(){const E=window.E,D=E.D;window.HF.pieces.forEach((p,i)=>{E.setOff(p.t0);const fn=window.M[p.id];if(!fn)throw new Error('no module '+p.id);"
            "fn({dur:+(p.t1-p.t0).toFixed(3),i,n:window.HF.pieces.length});});D.fillPills();E.setOff(0);E.buildShots();})();")
    html = f'''<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="engine.css">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script></head>
<body><div id="root" data-composition-id="root" data-start="0" data-duration="{VD}" data-width="{W}" data-height="{H}" data-fps="25" style="width:{W}px;height:{H}px">
<div class="layer" id="camLayer" style="z-index:10"><div class="inner" id="camIn">
<video id="cam" src="cam.mp4" data-start="0" data-duration="{VD}" data-media-start="0" data-track-index="0" muted playsinline></video></div></div>
<div class="layer" id="cutLayer" style="z-index:30"><div class="inner" id="cutIn">
<video id="cut" src="cut.webm" data-start="0" data-duration="{VD}" data-media-start="0" data-track-index="1" muted playsinline></video></div></div>
<div id="mediaHold">{mh}</div>
<script>window.HF={json.dumps(hf, ensure_ascii=False)};</script>
<script src="engine.js"></script><script src="devices.js"></script><script src="modules.js"></script>
<script>{reel}</script>
<script>window.__timelines = window.__timelines || {{}}; window.__timelines["root"] = E.tlRaw;</script>
</div></body></html>'''
    open(f'{out}/index.html', 'w').write(html)
write([])
r = subprocess.run(['node', 'probe.mjs', out, str(W), str(H)], capture_output=True, text=True)
if r.returncode: print(r.stdout, r.stderr); sys.exit(1)
info = json.loads(r.stdout.strip().splitlines()[-1])
if info['errs']: print('PAGE ERRORS', info['errs']); sys.exit(1)
write(info['media'])
print(out, VD, 'media', len(info['media']))
