---
name: ad-style
description: Edit a vertical talking-head ad / reel in the "ad style" the user signed off on — a clone of the Instagram reel https://www.instagram.com/reels/DXG8nysjHqQ/ - giant yellow Helvetica words BEHIND the presenter's head (matte), white caption pills, camera jump-zooms on every sentence, full-screen paper-collage scenes (dark navy grunge paper with typewriter titles + stamped yellow highlights + spiral notepad cards + grey cut-outs rising; light grey cloud paper with a crumpled ball that unfolds / paper that tears open, made with ChatGPT images + Seedance start/end frames; cut-out people with a yellow outline), a yellow clock behind the head, hands holding a phone that zooms into the screen back to camera, and a soft whoosh/pop/one-click sound palette. Use it WHENEVER the user asks for "ad style", "el estilo del anuncio", "como el reel de referencia", "estilo papel/collage con letras amarillas detrás de la cabeza", or hands over a reel/ad (Conquer Blocks / Tanda ads etc.) and wants it edited "igual que la referencia" with ChatGPT + Seedance paper effects.
---

# ad-style

The house recipe for vertical (1080×1920, 25 fps) talking-head ads in the style of
**IG reel DXG8nysjHqQ** (`reference/ref_DXG8nysjHqQ.mp4`, contact sheets
`reference/ref_sheet_1.jpg`, `ref_sheet_2.jpg`). First built 6 Oct 2026 on
`Tanda 10 EDITADO/EU AD3 Hook B - Reel 9x16 - papel v6.mp4` — the user's words:
"me encanta". That file is the bar: **look at it (or the reference) before
designing anything.**

What the user wants, in one line: **exactly the reference's visual language,
re-written for what THIS presenter says** — every graphic must mean the sentence
it sits on, never a generic schema ("no quiero los esquemas medio cutres").

## The look (measured from the reference — do not eyeball)

| Element           | Spec                                                                                                                                                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Yellow            | `#FAF400` (measured), never a warm/orange yellow                                                                                                                                                                                       |
| Big words         | Helvetica Neue Bold, letter-spacing −0.055em, line-height .82, 160–430 px, **behind the head** (person matte on top). Small companion words in white Helvetica Medium 48–64 px with a soft shadow, appearing word-by-word on the voice |
| Caption pills     | white rounded rect, radius 20, ~351×96 at centre y 1277, Helvetica Bold 54 px black, 1–3 words, chunk lasts until the next starts                                                                                                      |
| Typewriter titles | Courier Prime **Bold Italic** off-white (navy scene) or #222 (light scene), ~26–30 chars/s; key words as a **yellow stamped highlight** in Special Elite, black text                                                                   |
| Notepad cards     | off-white, black spiral rings on top, folded bottom-right corner, light Helvetica text, `#1/#2/#3` in yellow Inter Tight 800 italic above                                                                                              |
| Cut-outs          | real-photo objects/people; people get a **6 px yellow outline** (8 drop-shadows) + yellow bars over the eyes + tiny Courier labels; props in colour, landmarks/buildings grey                                                          |
| Grain             | 5% overlay grain on everything                                                                                                                                                                                                         |

**Safe area (square / horizontal):** no text glyph above ≈90 px in 1:1 and 16:9 — the user flagged text "demasiado arriba"
there. The approved vertical layout stays as it is unless the user asks.
Use `E.setLift()` + `scripts/textaudit.mjs` (see references/formats.md).

Ratio check: ~45% of the runtime is full-screen paper scenes, the rest camera.
Every spoken word is on screen (pill, small line, or the scene's title) — the user
has asked before for every word captioned.

## Pipeline (scripts in `scripts/`, engine in `templates/lib/`)

```bash
SK=.claude/skills/ad-style
bash $SK/scripts/new_project.sh edits/<name>                 # lib/, spec.js (example), project.json, folders
python3 $SK/scripts/prepare.py edits/<name> <cut.mp4> [--crop w:h:x:y]
#   -> work/base.mp4 (1080x1920 25fps -g 5), work/voice.wav, work/cut.webm (person matte), work/tr/transcript.json
#   transcription: OpenAI first, falls back to local mlx-whisper (~/.venvs/mlxw) — the API has often had no credits
# fill project.json: pieces = face focus (fx,fy) per camera set, music {track, offset}, out
# write spec.js beat by beat (see references/animations.md), generate assets (references/chatgpt-images.md),
# paper effects (references/seedance.md), list Seedance clips in media.json
cd edits/<name> && python3 ../../$SK/scripts/gen.py . && node ../../$SK/scripts/preview.mjs 1.5 7 21 39 49 && python3 ../../$SK/scripts/sheet.py 1.5 7 21 39 49
bash $SK/scripts/final.sh edits/<name>                       # render (~3 min / 55 s) + mix + mux to project.json "out"
```

- `preview.mjs` = fast puppeteer stills (`work/pv_<t>.png`), good for layout; **the
  matte does NOT show in it** (VP9 alpha) — only the hyperframes render proves text
  sits behind the head. Check a draft render early.
- Deliver as a **new file next to the original** (`… - <style> v1.mp4`), never overwrite.
- Audio-only revisions don't re-render: `python3 $SK/scripts/mix.py <dir> <dir>/renders/silent.mp4 <out>`.

## Beat planning (do this with the transcript, before any asset)

Map every sentence to ONE of the reference's devices, matching meaning:

1. **Big word behind the head** — the number / key noun of the sentence ("5 años",
   "tarde"→"cero", "0%", "crecer", "aquí abajo"). Small white words build the rest
   of the sentence word-by-word above/below. 1 per sentence, cut on the word.
2. **Side word (ref "pain/relief")** — reframe the camera sideways (`shot(t, 1.3, {dx: ±150})`)
   and put the word in the free side, or above the head if it is long.
3. **Clock behind the head** — any time span ("en tan solo 12 meses").
4. **Navy notepad scene** — any list of 2–3 items ("ni tu edad, ni tu título… solo
   saber hacer el trabajo"): typewriter title + #1/#2/#3 cards (strike the rejected
   ones in red marker, underline the right one in yellow) + a prop per card + two
   grey landmark/building cut-outs rising from the bottom corners.
5. **Light paper scene with a Seedance paper effect** — the aspirational or the
   painful picture ("trabajo en remoto" → ball unfolds onto a beach boardwalk;
   "tu trabajo actual los próximos 10 años" → paper tears onto a grey office). Huge
   black Helvetica word ("remoto", "certeza") + small grey lines + yellow
   typewriter highlight for the figure ("+3.000 €/MES", "LOS PRÓXIMOS 10 AÑOS"),
   cut-out people/person with yellow outline dropping in.
6. **Phone in hands (CTA)** — titles change per clause, the screen shows "¿qué
   profesión?" then the presenter live; props float; the camera pushes INTO the
   screen (scale 3.4) and cuts back to the camera.
7. **Pills** everywhere else, with a jump-zoom on each new sentence.

Don't use the same device twice in a row; never two full-screen scenes back to back
without camera between (the presenter must be seen regularly).

## Where each part is documented

- `references/animations.md` — every engine call with the exact parameters used
  (shots/zooms, matte, big words, lines, pills, typewriter, cards, cut-outs, clock,
  strokes, scenes, phone push), timing rules and the traps hit.
- `references/chatgpt-images.md` — generating backgrounds, start/end frames and
  cut-outs in the ChatGPT web app through Claude in Chrome (prompts that worked,
  JS helpers, clipboard save), and keying them (`whitekey.py`).
- `references/seedance.md` — the paper effects: Seedance 1.5 with start + end
  frame, prompts, cost, retiming, holding the last frame.
- `references/formats.md` — square and horizontal versions of the same edit (one spec with `L(v,s,h)`,
  16:9 Seedance clips cropped to square, layout rules per format).
- `references/batch.md` — a whole batch of reels from raw multi-take sets (pieces, modules, devices, queue).
- `references/sound.md` — the SFX palette the user approved after five rounds
  (one click, many whooshes, single pops, tick-tock) and the levels.
- `templates/spec.example.js` — the complete EU AD3 spec (55.6 s), the best
  worked example of all of the above.
