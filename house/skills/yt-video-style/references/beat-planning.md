# Beat planning — from the script to beats.json / x3d.json / heroes.json

Do this with the transcript open, sentence by sentence, BEFORE generating any asset. Every graphic must mean the sentence it
sits on (the user rejects generic schemas). Word times come only from the transcript (`L.at(word, n)` in scenes).

## Density targets (14-min reference, v13)

| Device                   | Count in 860 s               | Rule of thumb                                                                                                             |
| ------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Camera share             | ~31 % (incl. ov)             | never below ~25 %; presenter visible every ~20 s                                                                          |
| Picture change           | every ~4 s                   | shots + inserts                                                                                                           |
| 3D inserts (X)           | 37 + 9 chapter/number scenes | one every ~20 s; 3.5–4.6 s each (pillars up to 6.5 s)                                                                     |
| Full 2D/3D scenes (F)    | ~20                          | lists, comparisons, chapters, numbers; 5–12 s                                                                             |
| PiP windows (P)          | 5                            | charts / apps / journal while he explains a process                                                                       |
| Hero clips (H)           | 7                            | the big metaphors (opener, "método secreto", "el trading NO es…", estrategia, euforia/miedo, demo, perder)                |
| Avatar illustrations (A) | 6–8                          | the presenter as a character in a story beat (becario, colchón financiero…) — never vault/beach/retirement                |
| Envato stock (S)         | ~17                          | concrete nouns: oil field, coffee sacks, warehouse, traders, gold bars, graduation caps…                                  |
| Memes (M)                | 6                            | ironic beats (Wolf of Wall Street mansion, Futurama, Matrix "I know kung fu", Stonks — muted, Gatsby toast, This is fine) |
| Channel-video cards      | 4–5                          | every "te dejo un vídeo / en el canal" that matches a REAL video                                                          |
| Key-word subtitles       | 1 per camera shot at most    | numbers, key nouns, verbs of the thesis                                                                                   |

## Mapping sentence → device

1. **Opener (0–4 s)**: hero clip with a dive (H0: trading room, "TRADING" on the monitor) or a 3D scene. Then camera.
2. **Lists of 2–4 items** ("tres complicaciones", "estructura, orden y gestión") → full scene: 3D pillars / capsules / glass
   cards / checklist; each item lands ON its word.
3. **Numbers** ("13 años", "10.000 a 200.000 $", "5 %") → 3D extruded number / coin stacks / counter.
4. **Abstract claims** ("negocio a largo plazo", "diversificación", "apalancamiento") → a 3D metaphor (growth curve, platform
   on pillars, lever lifting coins). The user LOVED pillars — use them for any "base / requisitos / pilares" idea.
5. **Concrete things** (petróleo, café, barco, oficina) → Envato stock or a glossy tile beside the head.
6. **Story about himself** → flat avatar illustration (+ optional Seedance) or camera with key word.
7. **Process / tool** ("diario de trading", "demo", "gráfico", "stop loss") → PiP window with a mock app / chart.
8. **Chapters** ("vamos a lo primero", "la parte práctica", "demo vs real") → the 3D tile carousel advancing to Paso #n.
9. **Irony / pop culture** → meme with its sound, 2.5–5 s.
10. **"Te dejo un vídeo…"** → real card (thumbnail + exact title + duration) from the channel; promises of FUTURE videos → none.
11. **CTA (like / suscríbete / comentarios)** → YouTube UI recreation with cursor clicks.

## Ids and files

- `beats.json` items: I## (camera+overlay), C## (camera), F## (full), P## (pip), A## (avatar). Contiguous 0→duration.
- `x3d.json`: X## — they are cut INTO camera stretches; the planner splits the host (I05 → I05a/I05b) and those fragments need
  their own scene files (only their key words).
- `heroes.json`: H## — they replace whatever is under them; plan_heroes splits neighbours.
- Write a `note` on every item: what the scene shows, which words trigger what (`@palabra`). The forks work from the notes.

Example x3d note (good): "3D PILLARS: three pillars rise in sequence 'ESTRUCTURA' @estructura, 'ORDEN' @orden, 'GESTIÓN'
@gestión, roof 'METODOLOGÍA', the brand chess knight on top". See `scripts/engine/examples/x3d.example.json` (all 37).

## Checks on the plan

`plan_shots.py` prints picture-change cadence, inserts placed/skipped and fragments < 2 s (none allowed — merge or drop, e.g.
a stock clip squeezed to 0.9 s). Camera share: sum ov+cam ÷ duration. Then gaps.py after rendering.
