#!/usr/bin/env python3
"""seedance_heroes.py [ids] — run from work/style. Seedance 1.5 (higgsfield CLI, user's app credits) for every hero in heroes.json
that has a still gen_hero/<id>.png → clips/<id>.mp4. heroes.json items need "motion" (what moves, English) and "clip_dur" (4|8).
Cost ≈ 12 credits / 4 s, 24 / 8 s at 1080p — check `higgsfield account status` and tell the user before running.
avatars: pass --avatars to animate gen_avatars/<id>.png from beats.json av items with "motion" (flat-2D KEEP clause)."""
import json, os, subprocess, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
os.makedirs("clips", exist_ok=True)
KEEP = (" Keep the exact stylised 3D illustrated look, colours and lighting of the image; cinematic, smooth, physically plausible motion;"
        " no new objects, no people, no text or letters appearing.")
KEEP_FLAT = (" This is a FLAT 2D illustration: keep it a flat 2D cartoon drawing exactly like the image for the whole clip (same outlines, flat"
             " colours, grain, same character design), like a gentle 2D motion-graphics animation. Subtle, slow, clean movement only; no morphing,"
             " no new objects or characters, no text, no 3D look, static or very slow camera.")
AV = "--avatars" in sys.argv; args = [a for a in sys.argv[1:] if a != "--avatars"]
if AV:
    J = {x.get("clip", x["id"]): (x.get("clip_dur", 4), x["motion"], "gen_avatars") for x in json.load(open("beats.json"))["items"] if x.get("kind") == "av" and x.get("motion")}
else:
    J = {x["id"]: (x.get("clip_dur", 8), x["motion"], "gen_hero") for x in json.load(open("heroes.json")) if x.get("motion")}
def run(k):
    out = f"clips/{k}.mp4"
    if os.path.exists(out): return f"skip {k}"
    d, p, src = J[k]
    o = subprocess.run(["higgsfield", "generate", "create", "seedance1_5", "--prompt", p + (KEEP_FLAT if AV else KEEP), "--start-image", f"{src}/{k}.png",
                        "--duration", str(d), "--resolution", "1080p", "--aspect_ratio", "16:9", "--generate_audio", "false",
                        "--wait", "--wait-timeout", "30m", "--json"], capture_output=True, text=True)
    try: dd = json.loads(o.stdout); dd = dd[0] if isinstance(dd, list) else dd; urllib.request.urlretrieve(dd["result_url"], out); return f"ok {k}"
    except Exception: return f"FAIL {k}: {o.stdout[-300:]} {o.stderr[-300:]}"
with ThreadPoolExecutor(4) as ex:
    for r in ex.map(run, args or list(J)): print(r, flush=True)
