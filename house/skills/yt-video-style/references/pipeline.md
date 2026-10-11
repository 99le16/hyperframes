# Pipeline — layout, inputs, commands

## Layout (`scripts/new_project.sh <edit-dir> <cut.mp4>`)

```
edits/<name>/master.mp4 → the user's cut (symlink; 1080p 60 or 30 — the engine reads it at 30 fps)
edits/<name>/work/transcripts/transcript.json   [{text, start, end}] word timings (the clock of everything)
edits/<name>/work/faces.json                    [[t, fx, fy, fh], …] 2 fps face track (source pixels)
edits/<name>/work/mix.py, beats.py               generic audio helpers (from engine/mix_base.py) + librosa beat grid
edits/<name>/work/sourcing/stock_picks.json, stock/<id>.*   Envato picks
edits/<name>/work/style/                         the engine
   lib/ (lux.js lux.css l3d.mjs host.html adfonts* vendor/three)  scenes/ (kits + your <ID>.js)  out/ (ProRes 4444 overlays)
   prev/ (stills)  clips/ (Seedance avatar clips)  gen_avatars/ (avatar stills)  gen_hero/ + clips (hero stills/clips)
   yt/ (channel thumbnails)  models/chess (Poly Haven)  assets/ (glossy 3D tiles)  sfx/  fonts/
   project.json beats.json x3d.json heroes.json memes.json music.json  →  plan.json + scenes/_slots.js
edits/<name>/build/  picture.mp4 audio.wav (+ parts)
```

`new_project.sh` installs puppeteer-core (needs Google Chrome at /Applications), three@0.170.0 (`lib/vendor`), and fetches the
Poly Haven chess set. Rendering uses headless Chrome WebGL — it works, but scenes must add lights (metal renders black otherwise).

## Inputs

1. **Transcript**: local mlx-whisper (`~/.venvs/mlxw/bin/python`, see the transcribe-media skill) with word timestamps;
   OpenAI first if it has credits. Whisper rarely leaves gaps between words → the planner cuts on word STARTS.
2. **Faces**: `python3 $SK/scripts/facetrack.py edits/<name>/master.mp4 edits/<name>/work/faces.json` (YuNet, 2 fps, source pixels).
3. **Matte** (words behind the head): `~/.venvs/mlxw/bin/python scripts/rvm_matte.py <master30.mp4> work/style/matte30.mp4`
   (RobustVideoMatting, torch on mps; first make a 30 fps master: `ffmpeg -i master.mp4 -vf fps=30 -an -c:v libx264 -crf 14 master30.mp4`).
   ~25 min for 14 min. Start it in the background at the very beginning. Without it compose draws behind-words in front.
4. **project.json** — see brand-and-intake.md. `duration` = master duration (frames = round(duration×30)).
5. **beats.json** — the beat plan (beat-planning.md): `{"items":[{id, kind, s, e, cam?, clip?, note}]}` covering 0→duration
   contiguously. kinds: `ov` camera + overlay (cam rung W/M/T/SL/SR), `cam` camera only (may still get a scene), `full`
   opaque scene, `pip` window scene with the camera pasted in the PiP rect (1469,131)-(1882,948), `av` avatar illustration
   (`clip` = gen_avatars/<clip>.png; animated if listed in project.animated_avatars → clips/<clip>.mp4).
6. **x3d.json** `[{id:"X01", s, e, note}]` 3D inserts (cut INTO camera stretches, ≤ ~4.6 s, snapped to word ends).
7. **heroes.json** `[{id:"H0", s, e, zoom:[[t, z, cx, cy], …], note}]` hero clips (clips/<id>.mp4); `zoom` = camera dive keys in
   output pixels (z>1.5× jump between keys = accelerating dive). The overlay scene calls `L.heroCam(SLOTS.<id>.zoom)`.
8. **memes.json** `[{id:"M01", s, e, src:"<rel path from style/>", audio:"<wav>"}]`; project.trims lets a meme take a scene edge.
9. **stock_picks.json** `[{id:"S01", s, e, line, skip?}]` + files `sourcing/stock/S01.*`.
10. **music.json** — see sound-and-rhythm.md.

## Commands

```bash
cd edits/<name>/work/style
python3 plan_shots.py && python3 plan_heroes.py          # re-run whenever any input JSON changes (scene ids with a/b suffixes = camera fragments)
./base.sh <ID> 1.2 3.4                                   # camera base stills (no overlay) → prev/base/<ID>_<t>.jpg for previews
node render.mjs <ID> --at 1,3 [--under prev/base/<ID>_1.jpg]   # stills of the overlay → prev/<ID>_<t>.png  (look at them!)
node render.mjs <ID>                                     # full: out/<ID>.mov (+ out/<ID>_b.mov behind-head layer, out/<ID>.sfx.json cues)
node render.mjs <ID> --meta                              # only refresh the sfx cues
python3 gaps.py                                          # bare-camera runs (must all be ≤ ~6 s)
python3 compose.py --stills 12.5,300                     # composited stills → prev/still_*.jpg
python3 compose.py --jobs 4                              # full picture → ../../build/picture.mp4 (asserts frame count)
python3 mix.py                                           # → ../../build/audio.wav (−14 LUFS)
```

Render speed: 2D overlays ~20 fps, 3D scenes 6–15 fps. ≤4 renders in parallel (each is a Chrome). A 14-min video: ~150 scenes
≈ 45–60 min of rendering; compose ≈ 8 min (4 jobs); mix ≈ 3 min. Run long jobs with `run_in_background` and `caffeinate`.

## Team of forks

Author scenes with 4 forks by time range (≈15–25 ids each) + one dedicated 3D fork, all with the same brief
(scene-authoring.md "Fork brief"). Shared kits are owned by ONE fork; others only call them. After all forks: re-render
anything whose lib changed, run gaps.py, then compose. A final "gap-fixer" fork that iterates gaps.py until clean works well.
