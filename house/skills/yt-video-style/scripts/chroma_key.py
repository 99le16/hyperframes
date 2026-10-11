#!/usr/bin/env python3
"""key.py <id>... — chroma-key gen/<id>.png (flat #00FF00 or #FF00FF bg, auto-detected from the corners) → assets/<id>.png RGBA,
despilled, trimmed to ink + 24 px pad, square."""
import sys, os, numpy as np
from PIL import Image, ImageFilter
# run from work/style (reads gen/, writes assets/)
def key(i):
    a = np.asarray(Image.open(f"gen/{i}.png").convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    c = a[:8, :8].reshape(-1, 3).mean(0)
    mag = c[0] > 150 and c[2] > 150 and c[1] < 100
    k = (np.minimum(r, b) - g) if mag else (g - np.maximum(r, b))       # keyness
    al = 1 - np.clip((k - 40) / (150 - 40), 0, 1)
    al = np.asarray(Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.8))).astype(np.float32) / 255
    if mag:
        m = np.minimum(r, b); sp = np.clip(m - g, 0, None); r2, b2, g2 = r - sp, b - sp, g
    else:
        mx = np.maximum(r, b); sp = np.clip(g - mx, 0, None); r2, b2, g2 = r, b, g - sp
    out = np.dstack([r2, g2, b2, al * 255]).clip(0, 255).astype(np.uint8)
    im = Image.fromarray(out, "RGBA"); bb = im.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
    im = im.crop(bb); s = max(im.size) + 48
    sq = Image.new("RGBA", (s, s)); sq.paste(im, ((s - im.width) // 2, (s - im.height) // 2)); os.makedirs("assets", exist_ok=True)
    sq.save(f"assets/{i}.png"); return i, sq.size, "magenta" if mag else "green"
for i in sys.argv[1:]: print(*key(i))
