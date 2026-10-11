#!/bin/bash
# new_project.sh <edit-dir> <master.mp4>
# Lays out a yt-video-style project:
#   <edit-dir>/master.mp4                 (symlink to the user's cut)
#   <edit-dir>/work/transcripts/          (transcript.json goes here — see SKILL.md step 2)
#   <edit-dir>/work/mix.py                (generic audio helpers; engine/mix.py imports it)
#   <edit-dir>/work/style/                (the engine: lib/, scenes/, render.mjs, compose.py, plan_*.py, mix.py, gaps.py …)
#   <edit-dir>/build/                     (picture.mp4, audio.wav, final mux)
# and installs puppeteer-core, Three.js 0.170 (lib/vendor) and the Poly Haven chess set (models/chess, CC0).
set -euo pipefail
SK="$(cd "$(dirname "$0")/.." && pwd)"; E="$1"; M="$2"
mkdir -p "$E/work/transcripts" "$E/work/sourcing/stock" "$E/build" "$E/assets/music/masters"
ln -sf "$(cd "$(dirname "$M")" && pwd)/$(basename "$M")" "$E/master.mp4"
ST="$E/work/style"; mkdir -p "$ST"/{scenes,out,prev,clips,gen_avatars,gen_hero,yt,models}
cp -R "$SK/scripts/engine/lib" "$ST/"
cp "$SK/scripts/engine/"{render.mjs,compose.py,plan_shots.py,plan_heroes.py,mix.py,gaps.py,base.sh} "$ST/"
cp "$SK/scripts/engine/mix_base.py" "$E/work/mix.py"
cp "$SK/scripts/beats.py" "$E/work/beats.py"
cp "$SK/scripts/engine/scenes_kit/"*.js "$ST/scenes/"
cp -R "$SK/assets/tiles" "$ST/assets"; cp -R "$SK/assets/fonts" "$ST/fonts"; mkdir -p "$ST/sfx"; [ -d "$SK/assets/sfx" ] && cp -R "$SK/assets/sfx/." "$ST/sfx/" || echo "note: no sfx/ shipped (licensed) — drop your own WAVs into $ST/sfx, see NOT_INCLUDED.md"
echo "window.GREEN_IDS = [];" > "$ST/scenes/_green.js"
cd "$ST"
[ -d node_modules/puppeteer-core ] || npm install --silent --no-audit --no-fund puppeteer-core@23 >/dev/null
if [ ! -f lib/vendor/package/build/three.module.js ]; then mkdir -p lib/vendor && (cd lib/vendor && npm pack three@0.170.0 --silent >/dev/null && tar xzf three-0.170.0.tgz && rm three-0.170.0.tgz); fi
python3 "$SK/scripts/polyhaven_fetch.py" chess_set models/chess 1k >/dev/null && echo "models/chess ok"
find "$E" -name "._*" -delete 2>/dev/null || true
echo "project ready: $ST"
