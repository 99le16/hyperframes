#!/usr/bin/env python3
"""plan_heroes.py — step 2 of the plan: plan.json + HERO items from heroes.json (ChatGPT image → Seedance clip with motion graphics ON the clip and a push-through
transition into the next graphic, like ref q1g65sjQI-4 / ttdBbHyK7yE). Run plan9.py first (it writes plan.json), then this.
Hero items: kind 'hero', clip clips/<H>.mp4, overlay scenes/<H>.js; `portal` = [x, y, w, h] screen rect the camera dives into
at the end (compose zooms the clip into it), `zoom` keys [[t, z, cx, cy], ...] in clip pixels."""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(os.path.join(HERE, "plan.json")))["items"]
WORDS = json.load(open(os.path.join(os.path.dirname(HERE), "transcripts", "transcript.json")))
HEROES = json.load(open(os.path.join(HERE, "heroes.json"))) if os.path.exists(os.path.join(HERE, "heroes.json")) else []   # [{id, s, e, zoom:[[t,z,cx,cy]...], note}]
out = []
for it in P:
    for h in HEROES:                                    # cut every item around the hero window
        if it["e"] <= h["s"] + .01 or it["s"] >= h["e"] - .01: continue
        if it["s"] < h["s"] and it["e"] > h["e"]:       # hero inside an item: split it in two
            out.append(dict(it, id=it["id"] + "x", e=h["s"])); it = dict(it, id=it["id"] + "y", s=h["e"])
            if it.get("shots"): it["shots"] = [dict(x, t=max(0, round(x["t"] - (h["e"] - P[P.index(next(q for q in P if q["id"] == it["id"][:-1]))]["s"]), 2))) for x in it["shots"]]
        elif it["s"] < h["s"]: it = dict(it, e=h["s"])
        elif it["e"] > h["e"]:
            d = h["e"] - it["s"]; it = dict(it, s=h["e"])
            if it.get("shots"):
                sh = [dict(x, t=round(x["t"] - d, 2)) for x in it["shots"]]
                keep = [x for x in sh if x["t"] > 0]; first = [x for x in sh if x["t"] <= 0][-1:]
                it["shots"] = [dict(first[0], t=0.0)] + keep if first else keep
        else: it = None; break
    if it and it["e"] - it["s"] > .2: out.append(it)
    elif it and out: out[-1]["e"] = it["e"]
for h in HEROES: out.append(dict(h, kind="hero", clip=h["id"]))
out.sort(key=lambda x: x["s"])
for a, b in zip(out, out[1:]):
    assert abs(a["e"] - b["s"]) < .02, (a["id"], a["e"], b["id"], b["s"]); b["s"] = a["e"]
tiny = [(x["id"], round(x["e"] - x["s"], 2)) for x in out if x["e"] - x["s"] < 2.0]
for x in out:
    x["words"] = [[w["text"].strip(), round(w["start"] - x["s"], 2), round(w["end"] - x["s"], 2)] for w in WORDS if x["s"] - .05 <= w["start"] < x["e"]]
    if x.get("shots"): x["shots"] = [s for s in x["shots"] if s["t"] < x["e"] - x["s"] - .3] or x["shots"][:1]
json.dump({"items": out}, open(os.path.join(HERE, "plan.json"), "w"), ensure_ascii=False, indent=1)
slots = {x["id"]: {k: x[k] for k in ("kind", "words", "shots", "note", "cam", "line", "zoom") if k in x} | {"dur": round(x["e"] - x["s"], 3)} for x in out}
PRJ = json.load(open(os.path.join(HERE, "project.json")))
open(os.path.join(HERE, "scenes", "_slots.js"), "w").write("window.SLOTS = " + json.dumps(slots, ensure_ascii=False) + ";\nwindow.PROJECT = " + json.dumps(PRJ, ensure_ascii=False) + ";\n")
print(len(out), "items; tiny:", tiny)
print("changed:", [x["id"] for x in out if x["id"].endswith(("x", "y"))])
