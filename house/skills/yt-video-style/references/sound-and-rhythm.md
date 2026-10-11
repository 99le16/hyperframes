# Sound and rhythm

## Rhythm (numbers measured on v13)

- Picture change every ~4 s (camera shots 2.4–3.8 s + inserts). No shot < 2 s (the user: no flashes).
- Camera share ~31 %; never > ~6 s of bare camera (gaps.py).
- Snap-zoom (6 frames, ease-out cubic) into every tighter shot; 4 % push per shot; whip zoom-blur 4 frames in / 3 out on every
  non-camera item; hero dives accelerate (cubic) into a screen/object; white flash 0.25 s into the next 3D chapter.
- Inside full scenes: 2–4 `L.punch` snap zooms on key words, `L.shake` on impacts (crash, miedo, cuidado, perder).

## SFX palette (assets/sfx — approved on papel v6 after 5 rounds; same files used here)

| Cue                                         | File                                                       | Level (dB, after normalising loudest 25 ms to −14 dBFS) |
| ------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| scene / insert / meme / hero entry (whoosh) | whoosh_standard / whoosh_fast / whoosh_big (rotate)        | −5                                                      |
| camera cut                                  | swoosh_fast                                                | −13                                                     |
| snap-zoom                                   | sub_swoosh                                                 | −9                                                      |
| key word (`sfx:'click'`)                    | user_click (the user's own click — ONE click, not doubles) | −9                                                      |
| pop (tiles, cards, pills)                   | pop_a / pop_b (single bubbles)                             | −9                                                      |
| card / paper                                | whoosh_wave + pop                                          | −10 / −12                                               |
| typewriter (first run only)                 | typing (0.7 s)                                             | −27                                                     |
| music re-entry hit                          | whoosh_big / whoosh_wave                                   | −8                                                      |

Rules: no two of a kind within 0.12 s; a soft swoosh is dropped when a click/whoosh/pop lands within 0.15 s. Scenes log cues
automatically (L.sfx) → out/<ID>.sfx.json → mix.py. Typing sounds under every title were rejected («menos sonido de escritura»).

## Music that follows the script (music.json)

```json
{
  "cues": [
    {
      "id": "hook",
      "f": "AQ_M1_intro.wav",
      "a": 0,
      "b": 44.24,
      "lufs": -31,
      "from": 0,
      "loop": 30
    },
    {
      "id": "cred",
      "f": "M1_hook.wav",
      "a": 44.24,
      "b": 76.3,
      "lufs": -31,
      "hit": "hit",
      "from": 8
    },
    {
      "id": "cta",
      "f": "M4_practica.wav",
      "a": 824.3,
      "b": null,
      "fi": 0.6,
      "fo": 2.5,
      "hit": "hit",
      "from": 30
    }
  ],
  "dips": [
    [397.1, 401.9, -16],
    [648.0, 651.8, -14]
  ],
  "mute_memes": ["M04"]
}
```

- One cue per SECTION of the script, chosen by its emotion: tension for the hook/vendehumos, energy for credentials, calm
  for definitions, mystery for "tipos de mercado", motivational hip hop for the practical part, emotional piano for personal
  story, serious for "presión emocional", up again for the CTA.
- Cues start on a section's first item and enter the track on a librosa downbeat (`beats.py`, needs `~/.venvs/mlxw`).
- Dips (−13…−16 dB) under memes and before punchlines ("No es el patrón…", "13 años…").
- Beds ≈ −31…−33 LUFS before the voice duck; master loudnorm −14 LUFS, TP −1.5.
- The user rejected: corporate/lofi, cinematic documentary mystery, dark electronic. Approved for this channel: the
  "Aumenta 14 puntos tu IQ" tracks (Suspense Sci-Fi, Emotional Piano & Guitar ± beat, Sad Ambient Piano) + "Rich" (CrazyTunes)
  - "Motivational Powerful Hip Hop" (SERGMARU). Licence each per project on Envato.
