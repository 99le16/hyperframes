import sys, glob
from PIL import Image
ts = sys.argv[1:]
def f(t):
    for c in (t, str(float(t)), t.rstrip('0').rstrip('.')):
        p = f'work/pv_{c}.png'
        if glob.glob(p): return p
ims = [Image.open(f(t)).resize((270, 480)) for t in ts]
for k in range(0, len(ims), 9):
    g = ims[k:k+9]; sh = Image.new('RGB', (270*len(g), 480))
    for i, im in enumerate(g): sh.paste(im, (270*i, 0))
    sh.save(f'work/sheet_{k//9}.png')
