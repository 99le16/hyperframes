# QA and traps (all hit for real on trading-13, v1 → v13)

## Before delivering

1. Every overlay frame count == round(dur×30) (±1 — compose holds the last frame).
2. `python3 gaps.py` → no bare-camera run > ~6 s.
3. Contact sheet of the final at 1/4 fps (`ffmpeg -vf "fps=1/4,scale=320:-1,tile=8x7"`) + single frames at every hero dive,
   3D insert start, key word near a cut, card, meme. A contact sheet hides 1-second problems — sample suspicious seconds.
4. Frame count of the mux == duration×30; loudness −14 LUFS (`ebur128`).
5. Deliver next to the source as `<name> EDITADO vN.mp4`; report what was not watched at normal speed + licence caveats.

## Traps

- **Ñ / accents vanish**: the `.hl` tilde is drawn black above the highlight box (invisible on dark) and `background-clip:text`
  gradients don't paint above the line box → padding-top .16–.24em (lux.css already has it). Check a frame with "AÑO".
- **Text off-screen / cut**: lux `_guard` clamps .hv/.hvs/.tw boxes inside 36 px each frame (skips full/pip/hero). Fonts must
  be loaded before measuring (render waits for document.fonts).
- **@import in the middle of CSS is ignored** → fonts silently fall back (Times-like highlights). Keep @import first.
- **Words near a cut flash**: a key word starting < .45 s before a shot cut moves to the next shot (L.big does it); its line
  never shows before the shot starts.
- **L.at throws** when the anchor word left the slot after a re-plan (inserts split items) → rewrite fragment scenes.
- **gaps.py false alarms**: ffmpeg `alphaextract` fails on ProRes 4444 12-bit unless `format=yuva444p` first (fixed).
- **Camera reader ends 1 frame early** on the last chunk → compose holds the previous frame.
- **Whisper word gaps** are rare → cut candidates are word starts, not pauses.
- **ChatGPT page freezes** while generating → wait with `computer wait`, JS checks < 30 s; a missed click on the prompt box
  sends nothing (window resized).
- **Seedance pushes in by itself** → overlay positions measured on clip frames at the words.
- **Seedance invents objects** (floating monitor) → review every clip; use the still + push instead.
- **Bloom** too strong on metal/emissive → capped in l3d.mjs; keep emissive ≤ .35.
- **Metal looks black** in WebGL without lights/environment → l3d adds RoomEnvironment + lights.
- **Helvetiker 3D font has no accents** → canvas textures or 2D labels.
- **AppleDouble `._*` files** on the exFAT SSD break globbing/JS parsing → `find … -name "._*" -delete`.
- **zsh doesn't word-split** `for s in "A 1" …; set -- $s` → call commands explicitly.
- **Two sessions on one edit dir** → work in your own versioned dir (vN/), never overwrite another version.
- **macOS has no `timeout`**; long jobs → run_in_background + `caffeinate -dimsu`.
- **Subtitle colour**: subtitles stay `subtitle_color`; ONLY X (brand MG) scenes take the brand gradient — rewritten camera
  fragments are still subtitles.
