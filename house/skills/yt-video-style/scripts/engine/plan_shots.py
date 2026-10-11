#!/usr/bin/env python3
"""plan_shots.py — step 1 of the plan. Reads the project's beat plan and inserts, places every insert on its line,
splits the camera stretches around them, and writes a SHOT LIST per camera stretch (a cut every ~2.4–4 s on a word start,
alternating zoom rungs, slow push, snap-zoom into tighter shots) so text can be placed relative to the head in each shot.
Inputs (all in this engine dir unless noted):
  project.json  {"duration": s, "fps": 30, "master": "../../master.mp4", "trims": {"<id>": ["s"|"e", t]}}
  beats.json    {"items": [{id, kind: ov|cam|full|pip|av, s, e, cam?: W|M|T|SL|SR, clip?, note}]}  ← the beat plan you write
  x3d.json      [{id, s, e, note}]  full-screen 3D inserts (optional)
  memes.json    [{id, s, e, src, audio}]  meme clips with their own audio (optional)
  ../sourcing/stock_picks.json + ../sourcing/stock/<id>.*  Envato stock picks {id, s, e, line} (optional)
  ../transcripts/transcript.json  word timings [{text, start, end}];  ../faces.json  [[t, fx, fy, fh], ...] face track
Writes plan.json + scenes/_slots.js (per item: dur, kind, words, note, shots[{t, z, fxt, face, head:{cx, top, w, chin}}]).
Then run plan_heroes.py (hero clips) — it rewrites plan.json/_slots.js again."""
import json, os, re
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); WORK = os.path.dirname(HERE)
J = lambda n, d=None: json.load(open(os.path.join(HERE, n))) if os.path.exists(os.path.join(HERE, n)) else d
PRJ = J("project.json", {})
W, H, FPS, T_END = 1920, 1080, PRJ.get("fps", 30), PRJ["duration"]
BASE = J("beats.json")["items"]
X3D = J("x3d.json", [])
WORDS = json.load(open(os.path.join(WORK, "transcripts", "transcript.json")))
faces = json.load(open(os.path.join(WORK, "faces.json")))
FT = np.array([f[0] for f in faces]); FX = np.array([f[1] or np.nan for f in faces], float)
FY = np.array([f[2] or np.nan for f in faces], float); FH = np.array([f[3] or np.nan for f in faces], float)

# ---------------- inserts: memes first (they carry their own audio), then 3D inserts, then stock
ins = []
for x in X3D: ins.append(dict(id=x["id"], kind="full", s=x["s"], e=x["e"], note=x["note"], x3d=True))
for m in J("memes.json", []): ins.append(dict(m, kind="meme"))
SP = os.path.join(WORK, "sourcing", "stock_picks.json")
for x in (json.load(open(SP)) if os.path.exists(SP) else []):
    if x.get("skip"): continue
    f = next((os.path.join("../sourcing/stock", n) for n in os.listdir(os.path.join(WORK, "sourcing", "stock")) if n.startswith(x["id"] + ".")), None)
    if f: ins.append(dict(id=x["id"], kind="stock", s=x["s"], e=x["e"], src=f, line=x.get("line", "")))

def snap(t):                                    # snap a cut to the nearest word boundary (±0.3 s)
    best = t
    for w in WORDS:
        for b in (w["start"], w["end"]):
            if abs(b - t) < abs(best - t) + 1e-9 and abs(b - t) <= .3: best = b
    return round(best, 2)

TRIM = PRJ.get("trims", {})                                   # e.g. a meme takes the edge of a scene: {"A02": ["s", 22.63]}
V8 = [dict(x, **{TRIM[x["id"]][0]: TRIM[x["id"]][1]}, trimmed=True) if x["id"] in TRIM else x for x in BASE]
items = [dict(x) for x in V8 if x["kind"] not in ("ov", "cam")]
cams = [dict(x) for x in V8 if x["kind"] in ("ov", "cam")]
placed = []
for x in sorted(ins, key=lambda x: (x["kind"] != "meme", not x.get("x3d"), x["s"])):
    s, e = snap(x["s"]), snap(x["e"])
    if x["kind"] == "meme": s, e = x["s"], x["e"]
    if x.get("x3d"):                                   # snap to a neighbouring non-camera edge within 0.12 s
        for o in items + placed:
            if abs(o["e"] - s) < .12: s = o["e"]
            if abs(o["s"] - e) < .12: e = o["s"]
    if any(not (e <= o["s"] + .05 or s >= o["e"] - .05) for o in items + placed): continue   # never over a full/pip/av scene
    if x["kind"] != "meme" and not x.get("x3d") and not all(any(c["s"] - .05 <= t <= c["e"] + .05 for c in cams) for t in (s, (s + e) / 2, e)): continue
    placed.append(dict(x, s=s, e=e))
# subtract inserts from camera stretches; crumbs < 1.6 s are swallowed by the neighbouring insert
new = []
for c in cams:
    cuts = sorted([p for p in placed if p["s"] < c["e"] - .02 and p["e"] > c["s"] + .02], key=lambda p: p["s"])
    t, k, frags = c["s"], 0, []
    for p in cuts:
        if p["s"] > t: frags.append([t, p["s"], p])
        t = max(t, p["e"])
    if c["e"] > t: frags.append([t, c["e"], None])
    for a_, b_, nxt in frags:
        if b_ - a_ >= 2.0:
            new.append(dict(c, id=c["id"] + ("abcdefgh"[k] if cuts else ""), s=round(a_, 2), e=round(b_, 2))); k += 1
        else:                                   # crumb: give it to the insert before (or after)
            prev = [p for p in placed if abs(p["e"] - a_) < .02]
            if prev: prev[0]["e"] = b_
            elif nxt: nxt["s"] = a_
items += new + placed
items.sort(key=lambda x: x["s"])
for a, b in zip(items, items[1:]):
    assert abs(a["e"] - b["s"]) < .02, (a["id"], a["e"], b["id"], b["s"]); b["s"] = a["e"]
items[0]["s"] = 0.0; items[-1]["e"] = T_END

# ---------------- shots for camera stretches
FAM = {"W": [(1.0, None), (1.2, .5), (1.36, .5)], "M": [(1.2, .5), (1.0, None), (1.36, .5)], "T": [(1.36, .5), (1.12, .5), (1.0, None)],
       "SL": [(1.34, .635), (1.16, .60)], "SR": [(1.34, .365), (1.16, .40)]}
GAPS = [w2["start"] - .02 for w1, w2 in zip(WORDS, WORDS[1:])]
PUNCT = set(round(w2["start"] - .02, 3) for w1, w2 in zip(WORDS, WORDS[1:]) if w1["text"].strip()[-1:] in ",.?!:;" or w2["start"] - w1["end"] > .15)
def face(s, e):
    m = (FT >= s) & (FT <= e)
    if not m.any(): m = np.abs(FT - (s + e) / 2) < 3
    return float(np.nanmedian(FX[m])), float(np.nanmedian(FY[m])), float(np.nanmedian(FH[m]))
def head_box(z, fxt, fx, fy, fh):
    """where the head lands in the output for a shot (z, face-x target) — same maths as compose.cam_matrix (fy target .47)"""
    cw, ch = W / z, H / z
    if fxt is None: cx, cy = W / 2, H / 2
    else:
        x0 = np.clip(fx - fxt * cw, 0, W - cw); y0 = np.clip(fy - .47 * ch, 0, H - ch); cx, cy = x0 + cw / 2, y0 + ch / 2
    cx = np.clip(cx, cw / 2, W - cw / 2); cy = np.clip(cy, ch / 2, H - ch / 2)
    X = lambda x: z * (x - cx) + W / 2; Y = lambda y: z * (y - cy) + H / 2
    return dict(cx=round(X(fx)), top=round(Y(fy - .78 * fh)), w=round(z * fh * 1.05), chin=round(Y(fy + .55 * fh)))
k_alt = 0
for it in items:
    if it["kind"] not in ("ov", "cam"): continue
    fam = FAM[it["cam"]]; s, e = it["s"], it["e"]
    bounds = [s]
    while e - bounds[-1] > 4.4:
        want = bounds[-1] + 2.7
        g = [x for x in GAPS if bounds[-1] + 2.1 <= x <= min(bounds[-1] + 3.8, e - 2.1)]
        if not g: break
        bounds.append(round(min(g, key=lambda x: abs(x - want) - (.6 if round(x, 3) in PUNCT else 0)), 2))
    shots = []
    for i, b in enumerate(bounds):
        z, fxt = fam[(i + k_alt) % len(fam)]
        b1 = bounds[i + 1] if i + 1 < len(bounds) else e
        fx, fy, fh = face(b, b1)
        shots.append(dict(t=round(b - s, 2), z=z, fxt=fxt, face=[round(fx), round(fy), round(fh)], head=head_box(z * 1.02, fxt, fx, fy, fh)))
    k_alt += 1
    it["shots"] = shots
for it in items:
    it["words"] = [[w["text"].strip(), round(w["start"] - it["s"], 2), round(w["end"] - it["s"], 2)] for w in WORDS if it["s"] - .05 <= w["start"] < it["e"]]
json.dump({"items": items}, open(os.path.join(HERE, "plan.json"), "w"), ensure_ascii=False, indent=1)
slots = {x["id"]: {k: x[k] for k in ("kind", "words", "shots", "note", "cam", "line") if k in x} | {"dur": round(x["e"] - x["s"], 3)} for x in items}
open(os.path.join(HERE, "scenes", "_slots.js"), "w").write("window.SLOTS = " + json.dumps(slots, ensure_ascii=False) + ";\n")
from collections import Counter
c = Counter(); n = Counter()
for x in items: c[x["kind"]] += x["e"] - x["s"]; n[x["kind"]] += 1
nshots = sum(len(x.get("shots", [])) for x in items) + sum(1 for x in items if x["kind"] not in ("ov", "cam"))
print(len(items), "items", dict(n)); print({k: f"{v:.0f}s" for k, v in c.items()})
print("picture changes:", nshots, f"→ one every {T_END / nshots:.2f} s")
print("inserts placed:", [p["id"] for p in placed]); print("skipped:", sorted(set(x["id"] for x in ins) - set(p["id"] for p in placed)))
print("short:", [(x["id"], round(x["e"] - x["s"], 2)) for x in items if x["e"] - x["s"] < 2])
