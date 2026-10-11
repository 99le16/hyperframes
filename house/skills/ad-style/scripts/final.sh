#!/bin/bash
# final.sh <project_dir> — gen -> cues -> hyperframes render (silent) -> mix + mux to project.json "out".
# Audio-only revisions: skip the render, run  python3 mix.py <dir> <dir>/renders/silent.mp4 <out>
set -e
SK="$(cd "$(dirname "$0")" && pwd)"; P="$(cd "$1" && pwd)"
export HYPERFRAMES_EXTRACT_CACHE_DIR="$P/.hfcache"     # keep the frame cache off the system disk
python3 "$SK/gen.py" "$P"
node "$SK/cues.mjs" "$P/comp"
npx hyperframes render "$P/comp" -o "$P/renders/silent.mp4" -q looks --quiet
OUT=$(python3 -c "import json;print(json.load(open('$P/project.json'))['out'])")
case "$OUT" in /*) ;; *) OUT="$P/$OUT";; esac
python3 "$SK/mix.py" "$P" "$P/renders/silent.mp4" "$OUT"
echo "DELIVERED $OUT"
