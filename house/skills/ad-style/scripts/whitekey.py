"""whitekey.py in.png out.png [tol] [--split MINPX] — remove a flat white background reachable from the borders (keeps enclosed whites),
eat the halo, soft edge, crop to bbox. --split saves each connected object as out_<i>.png"""
import sys, numpy as np, cv2
from PIL import Image, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
tol = float(sys.argv[3]) if len(sys.argv) > 3 and not sys.argv[3].startswith('-') else 28
rgb = np.asarray(Image.open(src).convert('RGB')).astype(np.int16)
cand = (np.abs(255 - rgb).max(2) < tol).astype(np.uint8)
n, lab = cv2.connectedComponents(cand, connectivity=4)
border = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0}
bg = np.isin(lab, list(border)).astype(np.uint8)
if '--holes' in sys.argv:   # also drop enclosed, very flat-white pockets (gaps inside chairs, between arms...)
    strict = (np.abs(255 - rgb).max(2) < 9).astype(np.uint8)
    k, l3, st, _ = cv2.connectedComponentsWithStats(strict, connectivity=4)
    for j in range(1, k):
        if st[j][4] > int(sys.argv[sys.argv.index('--holes') + 1]): bg[l3 == j] = 1
bg = cv2.dilate(bg, np.ones((3, 3), np.uint8), iterations=2)
fg = (1 - bg).astype(np.uint8)
fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
_k, _l, _st, _ = cv2.connectedComponentsWithStats(fg, connectivity=8)   # drop specks (< 0.4% of the image)
for _j in range(1, _k):
    if _st[_j][4] < fg.size * float(__import__("os").environ.get("SPECK", "0.004")): fg[_l == _j] = 0
def save(mask, path, crop=True):
    a = Image.fromarray(mask * 255).filter(ImageFilter.GaussianBlur(1.0))
    o = Image.open(src).convert('RGBA'); o.putalpha(a); bb = a.getbbox(); o.crop(bb).save(path); return bb
if '--split' in sys.argv:
    mn = int(sys.argv[sys.argv.index('--split') + 1]); k, l2, st, _ = cv2.connectedComponentsWithStats(fg, connectivity=8); i = 0
    for j in sorted(range(1, k), key=lambda j: (st[j][1] // 200, st[j][0])):
        if st[j][4] < mn: continue
        print(i, save((l2 == j).astype(np.uint8), dst.replace('.png', f'_{i}.png'))); i += 1
else:
    print(dst, save(fg, dst))
