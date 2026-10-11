#!/bin/bash
# new_project.sh <project_dir> — scaffold an add-style edit: lib/ (engine, fonts), spec.js from the example, media.json,
# project.json to fill in, and the gen/ cuts/ seed/ work/ renders/ folders.
set -e
SK="$(cd "$(dirname "$0")/.." && pwd)"; P="$1"; mkdir -p "$P"/{gen,cuts,seed,work,renders,mix,refstills}
cp -R "$SK/templates/lib" "$P/"
[ -f "$P/spec.js" ] || cp "$SK/templates/spec.example.js" "$P/spec.js"
[ -f "$P/media.json" ] || echo '[]' > "$P/media.json"
[ -f "$P/project.json" ] || cat > "$P/project.json" <<J
{
 "base": "work/base.mp4",
 "matte": "work/cut.webm",
 "voice": "work/voice.wav",
 "words": "work/tr/transcript.json",
 "pieces": [{"t0": 0, "t1": 999, "fx": 540, "fy": 900}],
 "music": null,
 "out": "renders/final.mp4"
}
J
cp "$SK"/reference/*.jpg "$P/refstills/" 2>/dev/null || true
echo "scaffolded $P — fill project.json, then: python3 $SK/scripts/prepare.py $P <source.mp4>"
