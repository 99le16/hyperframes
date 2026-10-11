# Square (1:1) and horizontal (16:9) versions

Done 6 Oct 2026 for EU AD3 (`Tanda 10 EDITADO/EU AD3 Hook B - Cuadrado 1x1 | Horizontal 16x9 - papel v6.mp4`).
Worked example: `templates/spec.formats.example.js` — ONE spec for the three formats, every coordinate as
`L(vertical, square, horizontal)` (exposed by the engine as `E.L`, with `E.F`, `E.W`, `E.H`). Keep every TIME identical
across formats: then the vertical's final mix (`mix/final.wav`) is muxed onto the other renders as is — no re-mix.

## Inputs per format

- Camera base + person matte per format (1080×1080 / 1920×1080), each with its own face focus `pieces` (fx, fy).
  `project.json` → `"formats": {"S": {"base", "matte", "pieces", "media", "out"}, "H": {...}}`; `gen.py <dir> S|H` → `comp_S/`, `comp_H/`.
- Pills: `PILLY` 1277 (V) · 880 (S) · 905 (H) — on the chest.
- Backgrounds and Seedance frames: generate the **16:9** versions in the same ChatGPT chat («la misma imagen…
  en formato horizontal 16:9»: navy, light paper, cloud paper, cloud paper + ball, unfold end frame with the hole
  CENTRED, tear end frame). Run Seedance at `--aspect_ratio 16:9`, then **crop the square from the centre**
  (`crop=1080:1080:420:0`) — one clip serves both formats (2 clips = 24 credits instead of 4).
  The same prompt may produce a different tear (16:9 tear opened as a cross-shaped rip, slower: started at 1.0 s).

## Layout rules that worked

- **Square**: little headroom (head top ≈ 240–300). Small companion line at the very top (y 22, 44 px), big word under
  it (y 72, 130–260 px). Soften the zoom on shots that carry a big word (1.0–1.06 instead of 1.12–1.22) so the head
  doesn't swallow it. Navy cards in ONE row (#1 #2 #3, 300×260) under the title; towers in the bottom corners.
  Phone: hands scale .55 centred, title on top (54 px). Office group K .5, feet 1070.
- **Horizontal**: big words in the LEFT half (centre x 430, 135–300 px) beside the head, small line above them
  (y 250); long words ("profesionales") above the head. Clock behind the head (r 270), "12 meses" to the right.
  Navy: title top-left (84 px), cards in a row 440×370 at y 410. Phone: hands scale .64 at x 1280, title
  left-aligned at x 140 y 380 (78 px), push scale computed so the screen fills 1920×1080.
- Paper scenes: texts in the top ~45% (above the hole), cut-out person in the hole centre (S x 410, H x 830, w ≈ 280).
- Preview: `VW=1920 VH=1080 COMP=comp_H node preview_fmt.mjs t…` (viewport must match the format).
- Render the formats one after the other (parallel hyperframes renders have killed the session).

## Safe area — text must not sit too high (user: "a veces el texto está demasiado arriba y no se ve bien")

The top of the frame is covered by the platform UI (IG/TikTok username, buttons) or simply reads cramped.
Measured minimum glyph top that the user accepted (v7):

- **Vertical 9:16:** the approved v6 layout (glyph tops from ~130 px for big words behind the head) was kept as is — the user
  asked not to touch it. Apply the margin to NEW vertical edits only if the user asks.
- **Square: ≥ 75–90 px.** **Horizontal: ≥ 80–90 px.**

How: `E.setLift(L(0, 60, 0))` at the top of the spec. Every text/stroke/clock on the `behind`/`front` layers moves
down by LIFT AND every camera shot gets `dy = LIFT` with its zoom bumped by `LIFT/fy + 0.01`, so the words keep their
place relative to the head (behind it). Elements that must stay put (the CTA arrow at the bottom) take `lift: false`.
Paper-scene texts are on the `scenes` layer → move them by hand.
**Always run the audit before rendering:** `node scripts/textaudit.mjs comp_S 1080 1080 | awk '$3<90'` lists every
text whose rendered glyph top is above the margin (time, top, bottom, text).
