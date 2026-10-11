import json, subprocess, numpy as np, os
P = json.load(open("plan.json"))["items"]; T = int(json.load(open("project.json"))["duration"]) + 1; busy = np.zeros(T * 2, bool)
for it in P:
    a, b = int(it["s"] * 2), int(it["e"] * 2)
    if it["kind"] not in ("ov", "cam"): busy[a:b] = True; continue
    for f in (f"out/{it['id']}.mov", f"out/{it['id']}_b.mov"):
        if not os.path.exists(f): continue
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-vf", "fps=2,scale=96:54,format=yuva444p,alphaextract", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
        fr = np.frombuffer(raw, np.uint8).reshape(-1, 54 * 96)
        on = (fr > 40).mean(1) > .004
        on = on[:b - a]; busy[a:a + len(on)] |= on
runs, s = [], None
for i, v in enumerate(busy):
    if not v and s is None: s = i
    if v and s is not None: runs.append((s / 2, i / 2)); s = None
runs = sorted([r for r in runs if r[1] - r[0] >= 6], key=lambda r: r[0] - r[1])
for a, b in runs[:25]: print(f"{a:7.1f}-{b:7.1f}  {b-a:5.1f}s  ", [x["id"] for x in P if x["s"] < b and x["e"] > a])
print("camera-only total:", (~busy).sum() / 2, "s")
