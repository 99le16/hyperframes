#!/usr/bin/env python3
"""compose.py — v8 picture. 1080p30 on the source clock, frame-exact (NSRC frames).
  python3 compose.py [--jobs 4] [--from S --to E] [--stills t1,t2,...] [--out build/v8.mp4]
Per frame: base by item kind (cam reframe | pip | Seedance clip | black) + alpha overlay out/<ID>.mov.
Camera: master 60→30 fps, graded in ffmpeg; reframed per item with cv2.warpAffine (sub-pixel, slow push) on the face."""
import json, os, subprocess, sys, time, argparse
import numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); WORK = os.path.dirname(HERE); PROJ = os.path.dirname(WORK)
W, H, FPS = 1920, 1080, 30
PRJ = json.load(open(os.path.join(HERE, "project.json")))
NSRC = round(PRJ["duration"] * 30)
MASTER = os.path.normpath(os.path.join(HERE, PRJ.get("master", "../../master.mp4")))
GRADE = ("eq=contrast=1.07:saturation=0.96:gamma=0.98,"
         "colorbalance=rs=-0.03:gs=0.0:bs=0.03:rm=0.015:bm=-0.01:rh=0.03:gh=0.01:bh=-0.03")
fr = lambda t: int(round(t * FPS))
PLAN = json.load(open(os.path.join(HERE, "plan.json")))["items"]
for it in PLAN: it["fs"], it["fe"] = fr(it["s"]), fr(it["e"])
PLAN[-1]["fe"] = NSRC; assert PLAN[0]["fs"] == 0

# ---- face track (2 fps YuNet) → per-item median face centre
faces = json.load(open(os.path.join(WORK, "faces.json")))
FT = np.array([f[0] for f in faces]); FX = np.array([f[1] or np.nan for f in faces], float)
FY = np.array([f[2] or np.nan for f in faces], float); FHh = np.array([f[3] or np.nan for f in faces], float)
def face(s, e):
    m = (FT >= s) & (FT <= e)
    if not m.any(): m = np.abs(FT - (s + e) / 2) < 3
    return float(np.nanmedian(FX[m])), float(np.nanmedian(FY[m])), float(np.nanmedian(FHh[m]))
PUSH = .04                                       # slow push over each shot
SNAP = 6                                         # frames of snap-zoom into a tighter shot
def _center(z, fxt, fx, fy):
    cw, ch = W / z, H / z
    if fxt is None: cx, cy = W / 2, H / 2
    else:
        x0 = np.clip(fx - fxt * cw, 0, W - cw); y0 = np.clip(fy - .47 * ch, 0, H - ch); cx, cy = x0 + cw / 2, y0 + ch / 2
    return float(np.clip(cx, cw / 2, W - cw / 2)), float(np.clip(cy, ch / 2, H - ch / 2))
def cam_matrix(it, k):
    sh = it["shots"]; t = (k - it["fs"]) / FPS
    i = max(j for j, x in enumerate(sh) if x["t"] <= t + 1e-6)
    s0 = it["fs"] + round(sh[i]["t"] * FPS); s1 = it["fs"] + round(sh[i + 1]["t"] * FPS) if i + 1 < len(sh) else it["fe"]
    u = (k - s0) / max(1, s1 - s0); x = sh[i]
    z = x["z"] * (1 + PUSH * u); cx, cy = _center(z, x["fxt"], x["face"][0], x["face"][1])
    if i > 0 and x["z"] > sh[i - 1]["z"] + .05 and k - s0 < SNAP:            # snap-zoom in from the previous framing
        p_ = sh[i - 1]; v = 1 - (1 - (k - s0 + 1) / SNAP) ** 3
        zp = p_["z"] * (1 + PUSH); pcx, pcy = _center(zp, p_["fxt"], p_["face"][0], p_["face"][1])
        z = zp + (z - zp) * v; cx = pcx + (cx - pcx) * v; cy = pcy + (cy - pcy) * v
        cw, ch = W / z, H / z; cx = float(np.clip(cx, cw / 2, W - cw / 2)); cy = float(np.clip(cy, ch / 2, H - ch / 2))
    return np.float32([[z, 0, W / 2 - z * cx], [0, z, H / 2 - z * cy]])
for it in PLAN:
    if it["kind"] == "pip": it["_face"] = face(it["s"], it["e"])

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
VIG = (1 - .22 * np.clip(((xx - W / 2) / (W * .62)) ** 2 + ((yy - H / 2) / (H * .7)) ** 2, 0, 1) ** 1.3)[..., None]
PIP = (1469, 131, 1882, 948)
def round_mask(w, h, r):
    m = np.zeros((h, w), np.uint8); cv2.rectangle(m, (r, 0), (w - r, h), 255, -1); cv2.rectangle(m, (0, r), (w, h - r), 255, -1)
    for cx, cy in ((r, r), (w - r - 1, r), (r, h - r - 1), (w - r - 1, h - r - 1)): cv2.circle(m, (cx, cy), r, 255, -1, cv2.LINE_AA)
    return (m.astype(np.float32) / 255)[..., None]
PIPM = round_mask(PIP[2] - PIP[0], PIP[3] - PIP[1], 16)
def pip_base(cam, it):
    x0, y0, x1, y1 = PIP; pw, ph = x1 - x0, y1 - y0
    fx, fy, fh = it["_face"]; sh = 960.0; sw = sh * pw / ph
    sx = np.clip(fx - sw / 2, 0, W - sw); sy = np.clip(fy - .33 * sh, 0, H - sh)
    M = np.float32([[pw / sw, 0, -sx * pw / sw], [0, ph / sh, -sy * ph / sh]])
    crop = cv2.warpAffine(cam, M, (pw, ph), flags=cv2.INTER_LINEAR)
    out = np.zeros((H, W, 3), np.float32); out[y0:y1, x0:x1] = crop * PIPM
    return out

class Reader:
    def __init__(self, path, k0=0, vf=None, rgba=False, fps_in=None):
        self.n = W * H * (4 if rgba else 3); self.rgba = rgba
        vfs = f"fps={FPS},scale={W}:{H}:flags=lanczos" + (("," + vf) if vf else "")
        cmd = ["ffmpeg", "-v", "error"]
        if k0: cmd += ["-ss", f"{k0 / FPS:.4f}"]
        cmd += ["-i", path, "-vf", vfs, "-f", "rawvideo", "-pix_fmt", "rgba" if rgba else "rgb24", "-"]
        self.p = subprocess.Popen(cmd, stdout=subprocess.PIPE, bufsize=10 ** 8)
    def read(self):
        b = self.p.stdout.read(self.n)
        if len(b) < self.n: return None
        return np.frombuffer(b, np.uint8).reshape(H, W, 4 if self.rgba else 3)
    def close(self):
        try: self.p.stdout.close(); self.p.kill(); self.p.wait()
        except Exception: pass

_stills = {}
def av_still(it, k):
    if it["clip"] not in _stills:
        im = cv2.cvtColor(cv2.imread(os.path.join(HERE, "gen_avatars", it["clip"] + ".png")), cv2.COLOR_BGR2RGB)
        _stills[it["clip"]] = cv2.resize(im, (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
    u = (k - it["fs"]) / max(1, it["fe"] - it["fs"]); z = 1 + .08 * (1 - (1 - u) ** 1.6)
    cx, cy = W * .42, H * .45
    return cv2.warpAffine(_stills[it["clip"]], np.float32([[z, 0, cx - z * cx], [0, z, cy - z * cy]]), (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
SEED_OK = set(PRJ.get("animated_avatars", []))     # av items whose Seedance clip passed review; others = still + push
def clip_reader(it, k):
    """retimed clip (Seedance avatar) or an insert (stock / meme) with a slow push; frame 0 = item start"""
    if it["kind"] == "av":
        f = os.path.join(HERE, "clips", it["clip"] + ".mp4"); off = 0
    elif it["kind"] == "hero":
        f = os.path.join(HERE, "clips", it["clip"] + ".mp4"); off = 0
    else:
        f = os.path.normpath(os.path.join(HERE, it["src"])); off = 0.0 if it["kind"] == "meme" else 0.8
    d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True).stdout)
    need = it["e"] - it["s"]
    sp = need / d if it["kind"] in ("av", "hero") else (need / (d - off) if d - off < need else 1.0)
    n = it["fe"] - it["fs"]
    vf = (f"setpts={sp:.5f}*(PTS-STARTPTS),fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}," +
          f"zoompan=z='1+0.07*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS}")
    if it["kind"] in ("av", "hero"): vf = f"setpts={sp:.5f}*(PTS-STARTPTS),fps={FPS},scale={W}:{H}:flags=lanczos"
    if it["kind"] == "stock": vf += ",eq=contrast=1.06:saturation=1.05"
    r = Reader.__new__(Reader); r.n = W * H * 3; r.rgba = False
    r.p = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{off:.3f}", "-i", f, "-vf", vf, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                           stdout=subprocess.PIPE, bufsize=10 ** 8)
    for _ in range(k - it["fs"]): r.read()
    return r

def whip(img, k, it, nxt, prv):
    """zoom-blur whip into / out of non-camera items (scenes, inserts, avatars)"""
    cam = lambda x: x is not None and x["kind"] in ("ov", "cam")
    din, dout = k - it["fs"], it["fe"] - 1 - k
    amt = 0
    if din < 4 and prv is not None and (not cam(it) or not cam(prv)): amt = (4 - din) / 4
    if dout < 3 and nxt is not None and (not cam(it) or not cam(nxt)): amt = max(amt, (3 - dout) / 3 * .8)
    if amt <= 0: return img
    z = 1 + .14 * amt
    M = np.float32([[z, 0, W / 2 - z * W / 2], [0, z, H / 2 - z * H / 2]])
    out = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    acc = out.astype(np.float32)
    for j in (1, 2, 3):                                   # radial streak: average of slightly larger copies
        zz = z * (1 + .025 * j * amt); Mj = np.float32([[zz, 0, W / 2 - zz * W / 2], [0, zz, H / 2 - zz * H / 2]])
        acc += cv2.warpAffine(img, Mj, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return np.clip(acc / 4, 0, 255).astype(np.uint8)

CHAPTERS = []   # v11: user removed the chapter labels
LBL = {} if not CHAPTERS else {n: cv2.cvtColor(cv2.imread(os.path.join(HERE, "out", n + ".png"), cv2.IMREAD_UNCHANGED), cv2.COLOR_BGRA2RGBA) for _, _, n in CHAPTERS} if all(os.path.exists(os.path.join(HERE, "out", n + ".png")) for _, _, n in CHAPTERS) else {}
if not LBL: CHAPTERS = []

def run(k0, k1, out=None, stills=None):
    cam = Reader(MASTER, k0, GRADE)
    MP = os.path.join(HERE, "matte30.mp4")              # person matte (scripts/rvm_matte.py); without it behind-head words draw in front
    mat = None if os.environ.get("BASEONLY") or not os.path.exists(MP) else Reader(MP, k0, "format=gray")
    wr = None
    if out:
        wr = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                               "-an", "-c:v", "libx264", "-crf", "16", "-preset", "medium", "-pix_fmt", "yuv420p", "-g", "60",
                               "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709", out], stdin=subprocess.PIPE)
    lastc = None; lastclip = None; cur = None; ov = None; clip = None; bh = None; nxt = prv = None; t0 = time.time(); nout = 0; lasto = None
    for k in range(k0, k1):
        c = cam.read()
        if c is None: assert k >= NSRC - 3, f"cam ended at {k}"; c = lastc        # decoder rounding on the very last frame(s)
        lastc = c
        mm = mat.read() if mat else None
        it = next(x for x in PLAN if x["fs"] <= k < x["fe"])
        if it is not cur:
            if ov: ov.close()
            if clip: clip.close()
            if bh: bh.close()
            ov = clip = bh = None; cur = it; lasto = None
            ii = PLAN.index(it); nxt = PLAN[ii + 1] if ii + 1 < len(PLAN) else None; prv = PLAN[ii - 1] if ii else None
            fb = os.path.join(HERE, "out", it["id"] + "_b.mov")
            if os.path.exists(fb) and mat: bh = Reader(fb, k - it["fs"], None, rgba=True)
            if it["kind"] in ("stock", "meme", "hero") or (it["kind"] == "av" and it["clip"] in SEED_OK): clip = clip_reader(it, k)
            f = os.path.join(HERE, "out", it["id"] + ".mov")
            if os.path.exists(f) and not os.environ.get("BASEONLY"): ov = Reader(f, k - it["fs"], None, rgba=True)
        if stills is not None and k not in stills:
            if ov: ov.read()
            if clip: clip.read()
            if bh: bh.read()
            continue
        kind = it["kind"]
        if kind in ("cam", "ov"):
            Mc = cam_matrix(it, k)
            base = cv2.warpAffine(c, Mc, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT).astype(np.float32) * VIG
            if bh:                                                        # yellow words BEHIND the head
                ob = bh.read()
                if ob is not None and ob[..., 3].any():
                    if mm is None: mm = np.zeros((H, W), np.uint8)
                    pa = cv2.warpAffine(mm[..., 0] if mm.ndim == 3 else mm, Mc, (W, H), flags=cv2.INTER_LINEAR).astype(np.float32)[..., None] / 255
                    a = ob[..., 3:4].astype(np.float32) / 255 * (1 - pa)
                    base = base * (1 - a) + ob[..., :3].astype(np.float32) * a
        elif kind == "pip": base = pip_base(c, it)
        elif kind in ("stock", "meme", "hero") or (kind == "av" and clip):
            fr_ = clip.read() if clip else None
            if fr_ is None: fr_ = lastclip
            lastclip = fr_; base = fr_.astype(np.float32) if fr_ is not None else np.zeros((H, W, 3), np.float32)
            if kind == "hero" and it.get("zoom"):                       # camera dive keys [[t, z, cx, cy], ...]
                tt = (k - it["fs"]) / FPS; ks = it["zoom"]
                if tt <= ks[0][0]: z, cx, cy = ks[0][1:]
                elif tt >= ks[-1][0]: z, cx, cy = ks[-1][1:]
                else:
                    j = max(i for i, q in enumerate(ks) if q[0] <= tt); a_, b_ = ks[j], ks[j + 1]
                    u = (tt - a_[0]) / (b_[0] - a_[0]); u = u * u * u if b_[1] > a_[1] * 1.5 else u * u * (3 - 2 * u)   # dives accelerate
                    z, cx, cy = [a_[i] + (b_[i] - a_[i]) * u for i in (1, 2, 3)]
                base = cv2.warpAffine(base, np.float32([[z, 0, W / 2 - z * cx], [0, z, H / 2 - z * cy]]), (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
        elif kind == "av": base = av_still(it, k)
        else: base = np.zeros((H, W, 3), np.float32)
        if ov:
            o = ov.read()
            if o is None: o = lasto                                   # overlay 1 frame short (rounding): hold its last frame
            lasto = o
            if o is not None:
                a = o[..., 3:4].astype(np.float32) / 255
                base = base * (1 - a) + o[..., :3].astype(np.float32) * a
        if k < 12: base = base + (255 - base) * (1 - k / 12) ** 2           # open from white like the ref
        if kind in ("ov", "cam"):                                            # chapter label lower-left (ref q1g65sjQI-4)
            lb = next((c for c in CHAPTERS if c[0] <= k / FPS < c[1]), None)
            if lb is not None:
                la = LBL[lb[2]]; a = la[..., 3:4].astype(np.float32) / 255
                base = base * (1 - a) + la[..., :3].astype(np.float32) * a
        img = whip(np.clip(base, 0, 255).astype(np.uint8), k, it, nxt, prv)
        if stills is not None:
            cv2.imwrite(os.environ.get("STILL_OUT") or os.path.join(HERE, "prev", f"still_{k / FPS:08.2f}.jpg"), cv2.cvtColor(img, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 92])
        if wr: wr.stdin.write(img.tobytes()); nout += 1
        if (k - k0) % 600 == 0: print(f"[{k0}] {k}/{k1} {time.time() - t0:.0f}s", file=sys.stderr, flush=True)
    cam.close()
    if mat: mat.close()
    if ov: ov.close()
    if clip: clip.close()
    if wr: wr.stdin.close(); wr.wait(); assert nout == k1 - k0

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--jobs", type=int, default=4); ap.add_argument("--from", dest="fs", type=float)
    ap.add_argument("--to", type=float); ap.add_argument("--stills"); ap.add_argument("--out", default=os.path.join(PROJ, "build", "picture.mp4"))
    a = ap.parse_args()
    if a.stills:
        ks = sorted(fr(float(x)) for x in a.stills.split(","))
        for k in ks: run(k, k + 1, None, {k})
        sys.exit()
    k0 = fr(a.fs) if a.fs is not None else 0; k1 = fr(a.to) if a.to is not None else NSRC
    # split on item boundaries so readers start fresh
    bounds = [k0] + [x["fs"] for x in PLAN if k0 < x["fs"] < k1] + [k1]
    per = (k1 - k0) / a.jobs; cuts = [k0]
    for j in range(1, a.jobs): cuts.append(min(bounds, key=lambda b: abs(b - (k0 + j * per))))
    cuts = sorted(set(cuts)) + [k1]
    os.makedirs(os.path.join(PROJ, "build"), exist_ok=True)
    parts = [os.path.join(PROJ, "build", f"part{j}.mp4") for j in range(len(cuts) - 1)]
    from multiprocessing import Process
    ps = [Process(target=run, args=(cuts[j], cuts[j + 1], parts[j])) for j in range(len(parts))]
    [p.start() for p in ps]; [p.join() for p in ps]
    assert all(p.exitcode == 0 for p in ps), [p.exitcode for p in ps]
    lst = os.path.join(PROJ, "build", "parts.txt"); open(lst, "w").write("".join(f"file '{p}'\n" for p in parts))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", a.out], check=True)
    n = int(subprocess.run(["ffprobe", "-v", "error", "-count_packets", "-select_streams", "v:0", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", a.out], capture_output=True, text=True).stdout)
    print("frames", n, "expected", k1 - k0); assert n == k1 - k0
