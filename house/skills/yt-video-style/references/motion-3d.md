# Motion 3D — Three.js layer, brand stage, models

## Engine

- `lib/l3d.mjs`: three@0.170 via importmap (`lib/vendor/package`), WebGLRenderer (alpha, ACES, exposure .9), RoomEnvironment
  PMREM as scene.environment, ambient + key (white) + rim (blue) lights, EffectComposer + UnrealBloomPass.
  Bloom is CAPPED at render: strength ≤ min(set×.55, .5), threshold ≥ .88 — the user: «pon un poco menos de brillo, a veces te
  pasas». Emissive + point lights + bloom on gold blew coins to white; keep emissiveIntensity ≤ .35 on metals.
- The canvas sits between the background and the 2D world, so L.tw / labels draw over 3D.
- Headless Chrome renders WebGL fine (`--use-angle=metal`); render.mjs waits for `window.__3dready`.
- Deterministic: drive everything from t inside `S.on`, seeded random only (`K.rnd(seed)`), no clocks.
- Speed: 6–15 fps per scene; keep geometry reasonable (instancing for 100+ objects), 1k textures.

## Brand stage (dark brands)

Black/very dark background, reflective floor (Reflector or glossy plane) with a brand-colour glow strip on the horizon,
subtle grid, fog for depth, floating dust, god-ray cones, rim light from behind/above (raise it — a low rim made white glare
on glossy floors). Accents in `L.G` / `BRANDN` (brand gradient). Title: L.tw with a highlight on top.

## Recipes that worked (trading-13 v11–v13)

- Tile carousel (chapters): RoundedBoxGeometry tiles with icon textures, active tile flies forward / spins, "Paso #n · xx %".
- Extruded numbers over a field of 3D candles; coin stacks that grow; towers of coins compared (500 $ vs 10.000 $).
- Pillars (the user's favourite): fluted marble pillars rising out of the floor on each word, glowing strip + word, roof slab
  landing, emblem on top; the 2-pillar platform that wobbles on one pillar until the second rises ("no dependas de terceros").
- Lever on a fulcrum lifting a stack (apalancamiento), compound growth curve with year bars (largo plazo), gears meshing,
  3D phone with live chart + notifications, red warning triangle slam + shake, knight on a board with rings, network of pawns,
  road with year milestones, ring of 3 tiles (aprende → practica → adapta), risk dial to MIN, notebook writing points.

## External models — Poly Haven (CC0, free commercial use, no attribution)

```bash
python3 .claude/skills/yt-video-style/scripts/polyhaven_fetch.py --search chess          # find asset ids
python3 .claude/skills/yt-video-style/scripts/polyhaven_fetch.py chess_set models/chess 1k
python3 .claude/skills/yt-video-style/scripts/polyhaven_fetch.py --nodes models/chess/chess_set_1k.gltf   # node names
```

Load in a scene:

```js
const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
const g = await new GLTFLoader().loadAsync("../models/<dir>/<asset>_1k.gltf");
g.scene.updateMatrixWorld(true);
const node = g.scene.getObjectByName("<node>"); // clone geometry with mesh.matrixWorld applied, normalise to base y=0 / height 1
```

- The knight: l3d.mjs preloads `models/chess` and `window.KNIGHT(T, mat, H, yaw)` returns piece_knight_white_01 normalised,
  with your material + the model's normal map, yaw −1.15 (three-quarter profile — head-on hides the horse). Hand-made
  extruded knights were rejected twice («no me encaja el caballo… coge un modelo de internet»).
- Poly Haven is small (≈30 models); for other objects try its catalogue first, then build procedurally (lathe/extrude/
  RoundedBox), and only then other CC0 sources — check the licence and say it in the report.
- Brand emblems: Finance → chess knight; for other brands read the brandbook `cq`/`cqs` (codigo, maletin, virrete, niño, ai…)
  and build/fetch an equivalent object.

## 2D-in-3D text

Accented text in 3D (Ñ, á…): the Helvetiker typeface JSON has no accents → draw text on a canvas texture (`D.ctext`, `A.ctex`)
or keep text in the 2D layer glued to a 3D point (`K.label`).
