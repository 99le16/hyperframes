#!/usr/bin/env python3
"""polyhaven_fetch.py <asset_id> <out_dir> [res=1k] [--list]
Download a Poly Haven model (CC0 — free for commercial use, no attribution needed) as glTF + its textures.
  polyhaven_fetch.py chess_set models/chess 1k        → models/chess/chess_set_1k.gltf (+ .bin, textures/)
  polyhaven_fetch.py --search coin                      → asset ids whose name/tags match
Then in a scene: lib/l3d.mjs already preloads models/chess (the knight). For other models load them in L.three with
  const {GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js');
  const g = await new GLTFLoader().loadAsync('../models/<dir>/<asset>_1k.gltf'); const node = g.scene.getObjectByName('<node>');
(print node names with --nodes <gltf>)."""
import json, os, sys, urllib.request
API = "https://api.polyhaven.com"
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "yt-video-style"})))
a = sys.argv[1:]
if a and a[0] == "--search":
    q = a[1].lower(); d = get(f"{API}/assets?t=models")
    for k, v in d.items():
        if q in k or q in v.get("name", "").lower() or any(q in t for t in v.get("tags", [])): print(k, "|", v.get("name"), "|", ",".join(v.get("tags", [])[:6]))
    sys.exit()
if a and a[0] == "--nodes":
    d = json.load(open(a[1])); print([n.get("name") for n in d["nodes"]]); sys.exit()
asset, out, res = a[0], a[1], (a[2] if len(a) > 2 else "1k")
g = get(f"{API}/files/{asset}")["gltf"][res]["gltf"]; os.makedirs(out, exist_ok=True)
urllib.request.urlretrieve(g["url"], os.path.join(out, os.path.basename(g["url"])))
for rel, v in g.get("include", {}).items():
    os.makedirs(os.path.join(out, os.path.dirname(rel)), exist_ok=True); urllib.request.urlretrieve(v["url"], os.path.join(out, rel))
info = get(f"{API}/info/{asset}"); print(asset, "by", ",".join(info.get("authors", {}).keys()), "· CC0 · →", out)
