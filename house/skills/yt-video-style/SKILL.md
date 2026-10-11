---
name: yt-video-style
description: Edit a long-form (8–30 min) talking-head YouTube video in the premium "Iman Gadzhi / Under The Radar" style the user signed off on for Conquer Finance ("13 años en trading", v13) — camera reframes every ~4 s with snap-zooms and whip transitions, giant yellow key words behind the presenter's head (person matte) in the papel style, real Three.js 3D motion graphics in the channel's brand colours (glossy tile carousels, extruded numbers, coin stacks, pillars, a real chess-knight model from Poly Haven…), ChatGPT-web illustrations animated with Higgsfield Seedance with motion graphics glued on top and camera dives into the next scene, Envato stock + memes, real channel-video cards, papel sound palette and music that follows the script. Use it WHENEVER the user asks to edit a YouTube video "con el estilo de siempre / yt video style / como el de trading / estilo Gadzhi / con motion graphics 3D", gives a raw talking-head cut + a channel name, or wants another script edited "igual que el vídeo de 13 años en trading" — even if they don't name the skill.
---

# yt-video-style

The house recipe for long talking-head YouTube videos, distilled from 13 versions of
`conquer vídeos/pruebas/vídeo largo/vídeo largo EDITADO v13.mp4` (Conquer Finance, 14:20). That file is the bar —
**watch a few minutes of it before designing anything**. The user's verdict on v11–v13: «muy buen resultado… me encantan
las animaciones nuevas».

Style references the user gave (download them with yt-dlp, see `references/references-and-research.md`):

- Iman Gadzhi `_FGrUBi7Zno` — camera-first, sparkle bullets, glass cards, flat avatar illustrations.
- Iman Gadzhi `q1g65sjQI-4` — 3D icon carousels ("Side-Hustle #1"), illustrated 3D heroes with MG on top + dives.
- Under The Radar `ttdBbHyK7yE` — cinematic dark 3D, depth of field, rim light.
- `Tanda 10 EDITADO/EU AD3 Hook B - Reel 9x16 - papel v6.mp4` — the subtitle typography and the sound palette.

## 0. Before anything: ask (AskUserQuestion), then look up the brand

Ask in ONE AskUserQuestion call (Spanish, the user's language):

1. **¿Cómo se llama el canal?** (e.g. "Conquer Finance", "Conquer Blocks"…) — mandatory, it drives the brand.
2. **¿Qué estilo?** options: "Igual que 13 años en trading (Recommended)" · "Más cámara, menos gráficos" · "Más 3D y
   ritmo todavía" · (Other).
3. **Subtítulos**: "Solo palabras clave en amarillo papel (Recommended)" · "Palabras clave en el color de la marca" ·
   "Más subtítulos".
4. **Recursos**: multiSelect — "Envato stock", "Memes / pelis (yt-dlp)", "Ilustraciones ChatGPT + Higgsfield",
   "Escenas 3D", "Tarjetas de vídeos del canal".

Then read the brandbook artifact **https://claude.ai/artifact/Pxdw15YKEar51KYSrG2xhC** (`Artifact` action `read`, prompt
"colours, fonts, background, emblem"; it saves the raw HTML) and extract the channel's entry:

```bash
python3 .claude/skills/yt-video-style/scripts/brand_lookup.py <saved artifact.html>              # list brands
python3 .claude/skills/yt-video-style/scripts/brand_lookup.py <saved artifact.html> "Conquer Finance"
```

→ fonts, gradient stops, dark/light background, paper/grid/glow/glass flags, texture, emblem (e.g. caballo-ajedrez),
brand stat/claims. Put `brand_gradient` (3 stops) into `project.json`. Details: `references/brand-and-intake.md`.

## 1. What the style is (the rules the user taught us — don't relearn them)

| Thing      | Rule                                                                                                                                                                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Camera     | ~30–40 % of runtime; a new framing every ~2.4–4 s (cut on a word start, prefer after punctuation), rungs W/M/T/SL/SR, 4 % push per shot, 6-frame snap-zoom into tighter shots, headroom kept (face y target .47).                                                             |
| Never bare | No run of plain camera > ~6 s without a graphic (audit with `gaps.py`). The user called 43 s without animation «fatal».                                                                                                                                                       |
| Subtitles  | Only key words (≈1 per 5–10 s), giant Helvetica Neue Bold **papel yellow #FAF400**, BESIDE the head and tucked behind it (matte), small white Helvetica line building word by word above. Text inside brand MG scenes uses the brand gradient. Never pills on every sentence. |
| Typewriter | Courier Prime Bold Italic titles with stamped Special Elite highlights (accent background).                                                                                                                                                                                   |
| 3D         | Real Three.js, dark brand stage, rim light, DOF-ish fog, bloom LOW (the user: «menos brillo»). Every object moves on the spoken word. 3–5 s per insert, ≥1 every ~20 s.                                                                                                       |
| Heroes     | ChatGPT-web stills in the painterly-3D cinematic style (`assets/ref_hero_*.jpg`) → Seedance 1.5 → MG glued on the moving clip → camera dive into the next scene.                                                                                                              |
| Avatars    | Flat 2D bitmoji-like presenter illustrations (`assets/ref_avatar_flat_*.{png,jpg}`) — NOT glossy AI cartoons; Seedance only after checking each clip frame by frame.                                                                                                          |
| Inserts    | Envato stock (licensed per project), memes/film clips via yt-dlp with their own audio, real channel-video cards (real thumbnail + exact title).                                                                                                                               |
| Never      | vault/gold-room or retirement-beach imagery (reads as «vendehumos»), chapter footers, text off-screen/cut, accents/Ñ lost, frozen frames, shots < 2 s, AI-looking video.                                                                                                      |
| Sound      | papel palette (`assets/sfx`): whoosh on every scene/insert, soft swoosh on cuts, sub-swoosh on snap-zooms, user click only on key words, single pops, typing once. Music per section matching the script, dips before punchlines, −14 LUFS.                                   |

Full details: `references/style-rules.md` (look), `references/sound-and-rhythm.md`.

## 2. Pipeline (engine in `scripts/engine`, reference project `edits/trading-13/work/v11`)

```bash
SK=.claude/skills/yt-video-style
bash $SK/scripts/new_project.sh edits/<name> "<path to the user's cut.mp4>"     # engine, three.js, puppeteer, Poly Haven chess set
# transcript (word timings) → edits/<name>/work/transcripts/transcript.json   [{text,start,end}]  (mlx-whisper, see references/pipeline.md)
# face track → work/faces.json (scripts/facetrack.py) · person matte → work/style/matte30.mp4 (scripts/rvm_matte.py, ~25 min / 14 min video)
# write work/style/project.json  {duration, fps:30, master:"../../master.mp4", brand_gradient:[…], subtitle_color:"#FAF400", trims:{}, animated_avatars:[]}
# write the BEAT PLAN work/style/beats.json (+ x3d.json, heroes.json, memes.json, ../sourcing/stock_picks.json, music.json)
cd edits/<name>/work/style
python3 plan_shots.py && python3 plan_heroes.py          # → plan.json + scenes/_slots.js (words + shots + head boxes per item)
# author scenes/<ID>.js per item (forks, 15–20 ids each, brief = references/scene-authoring.md); preview + render:
node render.mjs <ID> --at 1,3 --under prev/base/<ID>_<t>.jpg ;  node render.mjs <ID>
python3 gaps.py                                           # bare-camera audit — fix every run > 6 s
python3 compose.py --jobs 4 && python3 mix.py             # → ../../build/picture.mp4 + audio.wav
ffmpeg -i ../../build/picture.mp4 -i ../../build/audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart "<out>.mp4"
```

Step-by-step with every file format: `references/pipeline.md`.

## 3. Where each part is documented

- `references/brand-and-intake.md` — the questions, the brandbook artifact, brand_lookup output → project.json, channel lookup with yt-dlp.
- `references/pipeline.md` — project layout, transcript/face/matte, every JSON the planner reads, plan → render → compose → mix, timings.
- `references/beat-planning.md` — how to turn the script into beats: which sentence gets a key word, a 3D insert, a hero, a stock clip, a meme, a card; density targets; examples from trading-13.
- `references/scene-authoring.md` — the lux engine API (L.big, L.words, L.tw, L.tile, L.videoCard, L.three, L.heroCam, L.slab, L.cross, L.punch, L.shake…), the 3D kits (\_3dkit, \_pillars, \_xA, \_fc, \_kitD, \_xb, \_ytD, \_roadmap), examples, and the fork brief to hand to sub-agents.
- `references/motion-3d.md` — Three.js layer, brand stage, bloom limits, knight model, Poly Haven (`scripts/polyhaven_fetch.py`), pillars, carousels, coins, extruded text, performance.
- `references/chatgpt-higgsfield.md` — ChatGPT web image flow (Claude in Chrome, clipboard save), the exact prompt style for avatars and heroes, Seedance 1.5 prompts, credits, review rules, tiles via higgsfield gpt_image_2 + chroma key.
- `references/stock-memes-cards.md` — Envato (licence per project, Claim Clear music), memes/film clips via yt-dlp (403 workaround, letterbox), real channel-video cards.
- `references/sound-and-rhythm.md` — cut cadence, zoom rungs, snap/whip timings, the SFX palette + levels, music cues per section, dips, loudness.
- `references/qa-and-traps.md` — the checks before delivering and every trap hit in 13 versions (Ñ, bloom, cut text, 1-frame-short overlays, alphaextract on ProRes, cam reader end, Whisper gaps, near-cut words…).

## 4. Delivery

Render a contact sheet at 1/4 fps + single frames at every doubtful moment, run `gaps.py`, check frame count == duration×30
and loudness −14 LUFS, then copy next to the source as `<name> EDITADO vN.mp4` (never overwrite). Report honestly what was
not watched at normal speed and any licence caveats (music licensed for another project, memes from films).
