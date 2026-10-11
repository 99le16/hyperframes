# Sound — the palette the user approved (5 revisions, 6 Oct 2026)

`scripts/mix.py` turns the cues the engine logs into sound. What the user asked for,
in order, and why the palette is what it is:

1. v1 had typewriter clicks under every title and marker scribbles → **"menos sonido de
   escritura, y si lo hay más bajo… whooshes, pops y clicks satisfactorios, agradable de oír"**.
2. **"cuando haya un texto importante, un click de ratón"**.
3. **"un solo click"** — the Envato mouse clicks are all press+release doubles (2–4
   transients) and most "Pop Bubbles" are 3–4 bubble rattles: they sounded odd. The
   clock's three ticks also sounded odd.
4. User supplied **their own click** (`sfx/user_click.wav`) and asked **"más whooshes y menos
   clicks"** and a real **tick-tock** on the clock.
5. **"bájale un pelín a la música, súbele a los efectos, sobre todo a los whooshes"** → final.

So:

| Cue (engine)                                                                                         | Sound                                                                   | Level     |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------- |
| `click` — only the 5–7 biggest words of the piece (`txt({…, sfx:'click'})`)                          | `user_click.wav` (always the same one)                                  | −9        |
| `whoosh` — scene entries, opener, landmarks rising                                                   | big whooshes (Standard / Big Standard / Fast), rotating                 | −5        |
| `swoosh` — other big words, highlights, strokes, later typewriter lines, jump cuts with nothing else | soft swooshes (Fast Swoosh / Standard / Fast Whoosh)                    | −10       |
| `pop` — cut-outs, cards, clock appearing                                                             | single-bubble pops only (`pop_a`, `pop_b`)                              | −9        |
| `paper` — card / paper scene                                                                         | wave whoosh + pop                                                       | −10 / −12 |
| `tick` / `tock` — clock                                                                              | Envato "Clock Tick Tock 01" tick, tock = same at 0.8 rate, every 0.45 s | −13       |
| `type` — first typewriter run only                                                                   | 0.7 s of typing                                                         | −27       |
| `zoomin` — push into the phone                                                                       | big whoosh + sub swoosh                                                 | −5 / −12  |

Every file is normalised (loudest 25 ms → −14 dBFS) before its level. No two sounds of
the same kind within 0.12 s; a soft swoosh is dropped if a click / big whoosh / pop
lands within 0.15 s. Music: Envato bed ducked to −19.5 dB in gaps / −25.5 under the
voice; total loudnorm −14 LUFS, TP −1.2. Bed+SFX peak ≈ −5 dBFS.

Licences: whooshes/pops/sub/typing come from Envato packs licensed for the Tanda 10
project; the clock from Envato (VadiSoundLibrary, licensed 6 Oct 2026); the click is
the user's own download. For a new client project, re-license on Envato (search
`mcp__envato__search_sound_effects`, download via `envato-stock`'s grab_download.py).
