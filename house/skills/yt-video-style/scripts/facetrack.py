#!/usr/bin/env python3
"""facetrack.py <master.mp4> <out faces.json> — YuNet face box at 2 fps → [[t, fx, fy, fh], …] in SOURCE pixels
(fx, fy = face centre, fh = face height; None when no face). Uses yunet.onnx next to this script."""
import cv2, json, subprocess, sys, os, numpy as np
P, OUT = sys.argv[1], sys.argv[2]; w, h = 960, 540
sw = int(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width", "-of", "csv=p=0", P], capture_output=True, text=True).stdout)
K = sw / w
det = cv2.FaceDetectorYN.create(os.path.join(os.path.dirname(os.path.abspath(__file__)), "yunet.onnx"), "", (w, h), 0.6)
p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", P, "-vf", f"fps=2,scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE)
out = []; i = 0
while True:
    b = p.stdout.read(w * h * 3)
    if len(b) < w * h * 3: break
    _, f = det.detect(np.frombuffer(b, np.uint8).reshape(h, w, 3))
    if f is not None and len(f):
        f = max(f, key=lambda r: r[2] * r[3]); x, y, ww, hh = f[:4]
        out.append([i / 2, round(float(x + ww / 2) * K, 1), round(float(y + hh / 2) * K, 1), round(float(hh) * K, 1)])
    else: out.append([i / 2, None, None, None])
    i += 1
json.dump(out, open(OUT, "w")); print(len(out), "samples →", OUT)
