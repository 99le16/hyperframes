# Animations — engine API and the exact recipes

Engine: `templates/lib/engine.js` (exposes `window.E`), styles `engine.css`. A spec
(`spec.js`) is plain JS run once; everything lands on one paused GSAP timeline that
hyperframes seeks frame by frame. Times are **programme seconds**; get them from the
take with `at(word, after)` / `ws('words of the line', after)` — never type a time
you have not looked up in the transcript (Whisper is the clock).

```js
const {
  tl,
  el,
  px,
  at,
  W_,
  cue,
  behind,
  front,
  scenes,
  shot,
  buildShots,
  matte,
  txt,
  line,
  pills,
  type,
  card,
  cutout,
  scene,
  clock,
  stroke,
} = E;
const ws = (s, after) => W_(s.split(" "), after); // 'en el mismo trabajo' -> [{w,t}] from the take
```

Layers (z): camera 10 · `behind` 20 · person matte 30 · `front` 40 · `scenes` 60 · pills 80 · grain 95.

## 1. Camera: jump zooms and reframes ("cambios de plano")

The reference cuts the camera on every new sentence: hard cut to another zoom, then
a slow push (3.5%) until the next cut. One `shot()` per sentence/beat:

```js
shot(0, 1.0);                 // wide
shot(1.92, 1.14);             // punch in on "5 años"
shot(3.44, 1.02);             // back out
shot(13.24, 1.3, { dx: 150 });  // reframe: head pushed right, left side free for "17 años"
shot(14.40, 1.3, { dx: -20 });
...
buildShots();                 // ALWAYS last line of the spec: builds sets + pushes so each push ends exactly at the next cut
```

- Zoom is around the face: `project.json` → `pieces[{t0,t1,fx,fy}]` (face x/y in the
  1080×1920 base, one per camera set / piece). Get fy from a frame, not by guess.
- Alternate ~1.0 / 1.12–1.24 so consecutive cuts read as cuts. Max dx at z 1.3 ≈ ±160 px.
- Each shot also logs a `cut` SFX cue (soft swoosh if nothing else sounds there).

## 2. Words behind the head

```js
matte(0, 6.3); // person cut-out on top of `behind` during [t0,t1) — turn it on for every behind-head stretch
txt(behind, {
  t: 1.92,
  out: 3.44,
  text: "5 años",
  size: 360,
  x: 540,
  y: 205,
  anchor: "c",
  color: Y,
  anim: "pop",
  sfx: "click",
});
line(front, {
  words: ws("en el mismo trabajo", 2.4),
  size: 64,
  x: 600,
  y: 505,
  anchor: "c",
  out: 3.44,
  cls: "hvs shadowed",
});
```

- Big word: `y` so the bottom ~20% of the letters is hidden by hair/head (selfie head top ≈ 510, desk ≈ 480, sofa ≈ 390 at z 1). Ref "Three" sits 274–534.
- `anim: 'pop'` = 0.16 s scale .86→1 + blur 6→0, back.out. Text appears ON the word.
- Small lines go on `front` (not behind — the head swallowed them) and **always get `out`** or they stay on screen forever.
- Width: ~0.29 em per char at −0.055em; > 1000 px gets cut — measure, shrink (No importa 210, profesionales 165).
- **t = 0 trap**: an element starting exactly at 0 never showed in the render (the hide-at-0 set wins). Start at 0.04.
- Swap words in place on the beat ("tarde" → "cero"), with a hand-drawn white ellipse stroke under the first one.

## 3. Pills

```js
pills(11.56, 13.24); // auto-chunks the take's words: ≤3 words / ≤15 chars, breaks on punctuation
```

Use them in every camera stretch without a big word. Scale-in .9→1 in 0.1 s.

## 4. Typewriter titles with yellow stamped highlights

```js
type(s, {
  x: 70,
  y: 280,
  size: 80,
  cps: 28,
  lines: [
    [{ t: "A las empresas hoy", at: 18.86 }],
    [
      { t: "no le ", at: 19.78 },
      { hl: "IMPORTAN", at: 20.3 },
    ],
  ],
});
type(s, { x: 540, anchor: "c", y: 625, size: 92, lines: [[{ hl: "+3.000 €/MES", at: 9.34 }]] }); // highlight alone
```

Plain runs type at `cps`; `hl` runs stamp in (scaleX .2→1 in 0.12 s). Navy scene:
off-white text, size 76–80. Light scene: `color: '#222'`. To change title per clause,
create one `type()` per clause and hide the previous one at the next clause's time.

## 5. Notepad cards (navy scene)

```js
card(s, {
  t: 21.02,
  x: 110,
  y: 640,
  w: 390,
  h: 340,
  rot: -2,
  text: "¿Tu edad?",
  size: 52,
  num: "#1",
});
cutout(s, { src: "cuts/cake.png", t: 21.15, x: 380, y: 590, w: 170, z: 4, rot: 8 }); // prop on the card corner
stroke(s, {
  t: 21.4,
  dur: 0.25,
  z: 6,
  color: "#d11",
  w: 9,
  d: "M 165 815 C 260 790, 360 830, 450 800",
}); // red strike
```

Layout that worked: #1 (110,640) and #2 (580,640) 390×340, #3 centred (300,1170) 480×400.
Cards pop (scale .6, back.out 1.8) with a paper sound.

## 6. Cut-outs

```js
cutout(s, {
  src: "cuts/tower1.png",
  t: 19.05,
  x: -170,
  y: 1040,
  w: 470,
  anim: "rise",
  z: 1,
  gray: true,
}); // landmark rising from the bottom
cutout(s, {
  src: "cuts/remote.png",
  t: 7.62,
  x: 300,
  y: 1010,
  w: 480,
  outline: Y,
  ow: 6,
  anim: "drop",
}); // person, yellow outline, bounces in
cutout(s, {
  src: "cuts/stopwatch.png",
  t: 50.38,
  out: 51.02,
  x: 735,
  y: 760,
  w: 250,
  z: 5,
  rot: 12,
  float: 10,
});
```

`anim`: pop (scale 0→1 back.out) · rise (from +900 px, expo.out) · drop (from −260, bounce.out).
People groups (ref "losing" scene): split the group PNG into persons
(`whitekey.py --split`), place them overlapping at one feet line (y 1880, scale .78),
yellow bars (92×26) over each pair of eyes from the raw-image eye coordinates,
tiny labels above heads ("otro lunes", "mismo sueldo", "¿10 años más?") — see the
office block in `spec.example.js`.

## 7. Full-screen scenes

```js
const s = scene(18.82, 26.3, { bg: "gen/bg_navy.png", sfx: "whoosh" }); // hard cut in/out like the ref
const s = scene(6.3, 9.68, { color: "#cfcfcf", sfx: "paper" }); // + a Seedance clip:
el("img", "abs", s, { left: 0, top: 0, width: "1080px", height: "1920px" }).src =
  "seed/unfold_remote_last.png"; // hold frame underneath
put("unfold_remote", s, 0); // the <video> from media.json moved into the scene
```

`media.json`: `{"id","src","t","d","mstart"}` — clip timing in programme time.
After the clip ends, its last frame (the img below) holds the scene.

## 8. Yellow clock behind the head

```js
matte(9.68, 11.56);
clock(behind, { t: 9.68, out: 11.56, x: 540, y: 560, r: 400 }); // hands spin; logs pop + tick/tock every .45 s
line(front, {
  words: ws("en tan solo", 9.6),
  size: 60,
  x: 250,
  y: 1330,
  cls: "hvs shadowed",
  out: 11.56,
});
txt(front, {
  t: 10.5,
  out: 11.56,
  text: "12",
  size: 330,
  x: 530,
  y: 1180,
  color: Y,
  anim: "pop",
  sfx: "click",
  cls: "hvi",
});
txt(front, {
  t: 10.94,
  out: 11.56,
  text: "meses",
  size: 92,
  x: 560,
  y: 1450,
  cls: "hvi shadowed",
  anim: "rise",
});
```

## 9. Phone in hands → push into the screen → camera

Hands image is full-frame 1080×1920 with the screen at (295,314) 488×1079 (measure
the green-screen rect of a new image). Structure: `outer` (push, origin = screen
centre after the inner scale) › `ph` (scale .78 from the bottom centre) › screen div
(white card "¿qué profesión?" in Gochi Hand, then the `phone_cam` video = the base
video at the same programme time, object-fit cover) + hands PNG on top.
Rise in `y 900→0` (0.5 s expo.out); push `scale 3.4` over 0.5 s power3.in ending on
the camera cut; hide props and titles at the push start. The screen already plays
the camera, so the cut back is nearly seamless. See the M block in the example.

## 10. Strokes

`stroke(parent, { t, dur, d: 'svg path', color, w, out })` draws the path on (dash
offset). Ellipse under a word, red strikes on cards, yellow underline, arrow
next to a title, yellow arrow pointing down at the CTA button.

## Checks before delivering

- Contact sheet of the render at 1.5 fps, then **single frames** at every element
  you doubt — a 1.5 fps sheet can miss a 0.6 s word; check with `ffmpeg -ss`.
- Every `line()` has `out`; nothing starts at t=0; no word cut by the frame edge;
  big words readable around the head; labels not white-on-white.
- Hyperframes render: `HYPERFRAMES_EXTRACT_CACHE_DIR` on the SSD (final.sh does it).

## Caption guarantees (Tanda 10 v2)

- `wordaudit.mjs <comp> W H [json]` seeks every spoken word (+0.1 s and +0.3 s) and lists those not readable on screen
  (number words match digits, euros/dólares match €/$). `gen_reel.py` runs it, feeds the misses back as `HF.gaps`,
  rebuilds and re-audits: gap words join the nearest `pills()` run (never a second pill on the same line), the rest get
  their own pill (y 1600 in 9:16 while a full-screen scene is up — the cards own y 1277).
- `pills()`: a chunk starts ≥ 0.12 s after the previous chunk's last word (Whisper packs words 0.1 s apart).
- clockBeat: "en menos de" + "1 año" are a white + yellow pill on the caption line — white text over the shirt was
  unreadable. side(): if the free side forces the word under ~130 px, it falls back to big() above the head.
- paper(): lines that land over the torn hole get a light paper strip (`.strip`); props never sit above the text block.
