"""sheet.py <comp_dir> W H t1 t2 ... -> work/sheet_<name>.png (preview stills tiled)"""
import sys, subprocess, os
from PIL import Image
d, W, H = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]); ts = sys.argv[4:]
name = os.path.basename(d)
subprocess.run(['node', 'preview.mjs', *ts], env=dict(os.environ, COMP=d, VW=str(W), VH=str(H)), check=True, capture_output=True)
tw = 220 if W < H else (300 if W == H else 380); th = int(tw * H / W)
ims = []
for t in ts:
    p = f'work/pv_{d}_{t}.png'.replace('/', '_', 0)
    dd = d.replace('/', '_'); cand = [f'work/pv_{dd}_{t}.png', f'work/pv_{dd}_{float(t)}.png', f'work/pv_{dd}_' + (str(float(t)).rstrip('0').rstrip('.')) + '.png']
    p = next((c for c in cand if os.path.exists(c)), None)
    ims.append(Image.open(p).resize((tw, th)))
cols = min(len(ims), 8 if W < H else 6); rows = (len(ims) + cols - 1) // cols
sh = Image.new('RGB', (tw * cols, th * rows))
for i, im in enumerate(ims): sh.paste(im, ((i % cols) * tw, (i // cols) * th))
sh.save(f'work/sheet_{name}.png'); print(f'work/sheet_{name}.png')
