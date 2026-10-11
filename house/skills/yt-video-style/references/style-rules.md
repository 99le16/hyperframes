# Style rules — the look, with the reason for each

## Camera (compose.py + plan_shots.py)

- Rungs (zoom, face-x target): W 1.0 · M 1.2 centred · T 1.36–1.40 centred · SL 1.34 face at .635 (free space LEFT) ·
  SR 1.34 face at .365 (free space RIGHT); face-y target .47 (the 16:9 take has almost no headroom — a lower target cuts the head).
- A cut every ~2.4–3.8 s on a word start (+bonus after punctuation), alternating rungs per family; 4 % push across each shot;
  6-frame ease-out snap-zoom when the next shot is tighter (+0.05 z or more). sub-pixel warpAffine (integer crops judder).
- Grade: `eq=contrast=1.07:saturation=0.96:gamma=0.98` + slight teal/orange colorbalance; vignette 22 %.
- Whip transition: radial zoom-blur on the first 4 / last 3 frames of any non-camera item.

## Subtitles (lux.js L.big / L.words / L.tw)

- Key word: Helvetica Neue Bold 260–340 px, letter-spacing −.055em, papel yellow #FAF400, placed BESIDE the head on the free
  side, inner edge tucked 45 px behind the head (`out/<ID>_b.mov` + matte). A bigger tuck hid whole letters ("rading").
- Its small white line (Helvetica Medium 54–62, shadow) wraps to the word's width above it and builds word by word, never
  before the shot starts.
- One word per shot max; it disappears at the shot cut (L.shotEnd). Words that would start < .45 s before a cut move to the
  next shot (otherwise they flash).
- Typewriter: Courier Prime Bold Italic off-white, ~28 cps; highlights = Special Elite black on the accent (scaleX stamp).
- Inside brand MG scenes (X ids) the accent is the brand gradient (background-clip text).
- The user: «no pongas tantos subtítulos… solo en lo más importante»; «los subtítulos que sigan del color que era».

## 3D (see motion-3d.md)

Dark brand stage, reflective floor with brand glow, subtle grid, dust, god-rays; rim light; bloom capped (strength ≤ .5,
threshold ≥ .88, exposure .9 — «pon un poco menos de brillo»). Glossy white tiles with coloured embossed icons (assets/tiles)
for objects; extruded numbers; coin stacks; marble/glass pillars; the brand emblem.

## Illustrations

- Heroes: stylised 3D illustration, painterly texture, dark cinematic light with a warm spotlight + blue reflections, DOF,
  bokeh, no people/text (assets/ref_hero_pedestal.jpg, ref_hero_slot.jpg).
- Avatars: flat 2D bitmoji (assets/ref*avatar_flat*\*.{png,jpg}): big head, simple face, thin dark outlines, flat soft
  gradients, grain, dusk skyline. The user hated glossy semi-3D AI cartoons and AI-looking video.

## Windows / cards

- PiP: rounded window x38–1432 y131–948 + presenter column 1469–1882 over the brand aurora/stage.
- Channel-video card: real thumbnail, duration badge, title (exact), channel line with avatar, slide in, cursor click.
- YouTube UI (comments, like/subscribe/bell) for the CTA.

## Never (all came from the user)

vault/gold room · retirement on a beach/terrace (vendehumos) · chapter footers ("Paso 3 · LA PARTE PRÁCTICA" in a corner) ·
loud memes over his voice (mute or duck) · text off-screen / cut by an edge · lost Ñ/accents · glow that blows out ·
43 s without graphics · shots < 2 s · presenter missing for long · a wobbly hand-made chess knight.
