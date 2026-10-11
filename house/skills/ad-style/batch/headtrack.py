"""headtrack.py <AD> <F> -> ../tanda10-reels/work/ads/<AD>_<F>.head.json : person-matte head box every 0.2 s
[[t, top, x0, x1], ...] in base-frame px (before the composition's camera zoom). top = first row with >= 1.2% of width covered."""
import json, subprocess, sys, numpy as np
AD, F = sys.argv[1], sys.argv[2]
T10 = '../tanda10-reels/work'
W, H = {'V': (1080, 1920), 'S': (1080, 1080), 'H': (1920, 1080)}[F]; k = 4; w, h = W // k, H // k
src = f'{T10}/ads/{AD}_{F}_cut.webm'
p = subprocess.run(['ffmpeg', '-v', 'error', '-c:v', 'libvpx-vp9', '-i', src, '-vf', f'fps=5,scale={w}:{h},format=yuva420p,alphaextract,format=gray', '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
fr = np.frombuffer(p, np.uint8).reshape(-1, h, w) > 128
out = []
for i, m in enumerate(fr):
    rows = m.sum(1); r = np.flatnonzero(rows >= max(2, 0.012 * w))
    if not len(r): out.append([round(i / 5, 2), None, None, None]); continue
    top = r[0]; band = m[top: top + int(0.10 * H / k)]
    cols = np.flatnonzero(band.any(0))
    out.append([round(i / 5, 2), int(top * k), int(cols[0] * k), int(cols[-1] * k)])
json.dump(out, open(f'{T10}/ads/{AD}_{F}.head.json', 'w'))
v = [o for o in out if o[1] is not None]
print(AD, F, len(out), 'samples; top median', int(np.median([o[1] for o in v])))
