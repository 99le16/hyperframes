# Scene authoring — the lux engine and the fork brief

A scene is `scenes/<ID>.js`, plain JS run once in headless Chrome (lib/host.html loads `_slots.js`, `_green.js`, `lux.js`,
then the scene; `l3d.mjs` adds Three.js). Everything is a pure function of scene time t (`window.__seek(t)`), so renders are
deterministic. Times are SCENE-relative; anchor them on words: `L.at('palabra', n)` (n-th occurrence inside this slot,
accent/case-insensitive; throws if missing — never guess a time), `L.say('from', 'to', n)` → [[word, t], …].
`SLOTS[id]` = {dur, kind, words, shots[{t, z, head:{cx, top, w, chin}}], note, zoom?}. `L.dur` = slot length.

## Camera scenes (kind ov / cam) — key words only

```js
L.scene();
L.big({
  text: "dinero",
  t: L.at("dinero") - 0.03,
  size: 320,
  sfx: "click",
  line: L.say("que", "mueve"),
});
L.tile({
  src: "../assets/chart.png",
  x: 170,
  y: 250,
  size: 320,
  t: L.at("trading"),
  out: L.dur,
  label: "Trading",
  from: -60,
});
```

- `L.big` puts the word beside the head of the shot active at t (`side: 'auto'|'l'|'r'`, `tuck`, `dy`), behind the head
  (`behind: true` → rendered into `<ID>_b.mov`, compose puts the person matte over it). Default `out` = end of its shot.
  On camera/clip items only words with `sfx: 'click'` or `keep: true` are drawn (L.FEW filter) — that is the "few
  subtitles" rule; use `keep: true` sparingly.
- `L.words({words, x, y, size, anchor, keep})` small white line (also filtered on camera).
- `L.tile` glossy 3D tile PNG (assets/tiles: chart bitcoin gold forex oil barrel coffee wheat sugar box monitor stocks books
  trophy gradcap people play camera warning plane car beach chest) popping in beside the head with a script label.
- `L.videoCard({x:1290, y:90, w:540, title, thumb:'../yt/<id>.jpg', dur:'25:20', t, out})` or the richer `YTD({...})` (\_ytD.js,
  3D slide-in + cursor click). Show it from the moment he starts talking about the video.
- Use `./base.sh <ID> <t>` to see the real framing; check the head box with `L.head(t)`.

## Full scenes (kind full / pip)

`L.scene({bg: 'aurora'})` (or a brand stage via the 3D kits), `L.tw` typewriter titles with highlights, `L.card` glass cards,
`L.tube` liquid capsules, `L.counter`, `L.chartWin` + `L.drawLine` + `L.pill` (trading platform), `L.window` (white app),
`L.checkRow`, `L.pipHole()` (PiP cut-out for the camera), `L.camera(keys)` world moves, `L.punch(t, 1.15, x, y)` snap zoom,
`L.shake(t, amp)`, `L.slab` big glowing word, `L.cross` red marker ✕, `L.flashOut(t)` white flash into the next scene.

## 3D (L.three)

```js
L.scene({ bg: "#04060d" });
(function () {
  for (const f of ["_3dkit", "_xA"]) {
    const x = new XMLHttpRequest();
    x.open("GET", "../scenes/" + f + ".js", false);
    x.send();
    (0, eval)(x.responseText);
  }
})();
L.tw({
  x: 960,
  y: 70,
  size: 54,
  anchor: "c",
  lines: [
    [
      { t: "Conozco el juego ", at: L.at("juego") },
      { hl: "DESDE DENTRO", at: L.at("dentro") },
    ],
  ],
});
L.three(async (T, S) => {
  const K = await K3.init(T, S, {}); // brand stage: floor reflection, glow, fog, dust (see _3dkit.js header)
  const kn = window.KNIGHT(T, A.green(), 3.2);
  S.scene.add(kn);
  S.on((t) => {
    kn.rotation.y = -1.15 + t * 0.4;
    S.camera.position.set(Math.sin(t * 0.3) * 4, 2.2, 10 - t);
    S.camera.lookAt(0, 1.5, 0);
  });
});
```

S = {T, scene, camera, renderer, bloom, composer, key, rim, on(fn)}. Kits (load order matters):

- `_3dkit.js` K3/K: stage, materials (gold, yellow→brand, chrome, glass), coins/bars/stacks, candles, dust, streaks, labels glued
  to 3D points (`K.label`), camera paths with shakes (`K.cam`), flashes. Chapter carousel + numbers (F03/F05/F11/F16/F17/F02/F12).
- `_pillars.js` PIL: fluted marble pillars rising, god-rays, dust bursts, glowing words, roof slab, knight on top (X06/X22/X32).
- `_xA.js` A (spot, materials, ctex canvas textures, knight, board), `_fc.js` FC (gears, phone screen, pawns, board), `_kitD.js`
  D (brand stage, ctext accented 3D text), `_xb.js` XB, `_ytD.js` YTD (YouTube card), `_roadmap.js` RM (2D roadmap grid).
- Examples: `scripts/engine/examples/` X21 (coins flowing between blocks), X22 (hero pillars), X25 (knight on board),
  X_LEV (lever), F03 (tile carousel), H2 (hero overlay glued to a Seedance clip), I02 (camera key words), I30 (card), P01 (chart PiP).

Pillars (verified from a fresh project):

```js
(function(){for(const f of ['_3dkit','_pillars']){const x=new XMLHttpRequest();x.open('GET','../scenes/'+f+'.js',false);x.send();(0,eval)(x.responseText);}})();
L.scene({bg: 'none'});
L.three(async (T, S) => {
  const K = await K3.init(T, S, PIL.stage);
  await PIL.build(T, S, K, {names: ['ESTRUCTURA', 'ORDEN', 'GESTIÓN'], rise: [t1, t2, t3], lit: [t1 + .2, t2 + .2, t3 + .2], spacing: 3.9,
    wordSize: 60, roof: {t: .15, settle: t3 + .3, text: 'METODOLOGÍA', textT: .5, size: 46}, knight: {t: .45}});
  K.cam([[0, [x, y, z, lookX, lookY, lookZ, fov]], [L.dur, [...]]], L.ease.inOutCubic);
});
```

## Hero overlays (kind hero)

`L.scene(); L.heroCam(SLOTS.H2.zoom);` — the 2D world follows the compositor's dive exactly, so text sits ON the clip.
Seedance moves the camera by itself: measure object positions on clip frames at each word (`ffmpeg -ss <t*clipDur/slotDur>`),
never on the start image. End with the dive (zoom key with z jump) or `L.flashOut`.

## Preview loop (mandatory)

`node render.mjs <ID> --at t1,t2 --under prev/base/<ID>_<t>.jpg` → LOOK at the PNGs; fix collisions, cut text, empty
seconds. Then full render. Every frame count must equal round(dur×30) (±1; compose holds the last frame).

## Fork brief (paste into each sub-agent prompt)

"You are scene-author fork N. Work ONLY in edits/<name>/work/style. Read .claude/skills/yt-video-style/references/
scene-authoring.md, style-rules.md and motion-3d.md, scenes/\_3dkit.js and the examples. Your IDs: … (read each note in
plan.json / scenes/\_slots.js). Brand: project.json (subtitles = subtitle_color; X scenes = brand gradient). Only your files;
don't edit lib/, compose.py, plan\*.py, render.mjs or other forks' scenes (shared kits belong to fork <k>). Anchor only via
L.at / L.say. Every insert REAL 3D where it says 3D, cinematic, constant motion, objects animate on the words, bloom low,
no static second; camera items: only key words, never > 6 s bare. Preview, LOOK, fix, render (≤2 at once). Report IDs +
frame counts + anything skipped."
