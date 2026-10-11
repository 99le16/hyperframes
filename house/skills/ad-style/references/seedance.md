# Paper effects with Seedance (start frame + end frame)

The reference's signature transition — a crumpled paper ball that grows, opens and
reveals a new scene — is not drawn in code: it is **Seedance 1.5 interpolating
between two ChatGPT frames** made in the same chat (so the background matches).

## Command

Use the `higgsfield` CLI (app subscription credits — never the Cloud API keys):

```bash
higgsfield generate create seedance1_5 \
  --prompt "<prompt>" --start-image seed/start.png --end-image seed/end.png \
  --duration 4 --resolution 1080p --aspect_ratio 9:16 --generate_audio false \
  --wait --wait-timeout 15m --json > seed/x.json
curl -s -o seed/x.mp4 "$(grep -o '"result_url": "[^"]*' seed/x.json | head -1 | cut -d'"' -f4)"
```

12 credits per 4 s clip at 1080p (`higgsfield account status` shows the balance).
Run it in the background while you build the spec. Frames must be 1080×1920 PNGs.

## Prompts that worked

**Unfold (ball → torn hole revealing a scene)** — start: grey cloud paper + small
crumpled ball; end: same paper, torn newspaper opening onto the scene:

> Stop-motion paper collage animation. The small crumpled newspaper ball in the center quickly grows and unfolds, the paper opens up and tears apart, revealing a sunny seaside boardwalk with palm trees through the torn newspaper hole. The grey cloudy paper background stays perfectly still. Static camera, no camera movement, crisp paper texture, fast energetic unfold in the first second, then hold.

Result: the ball swells, flies at the lens and opens into the hole — great, but the
reveal lands at ~2.75 s. **Retime**: `ffmpeg -ss 0.5 -i x.mp4 -vf "setpts=PTS/1.7,fps=25" -an -c:v libx264 -crf 14 -g 5 x_fast.mp4`
→ reveal 1.3 s after the scene starts.

**Tear (paper rips open onto a scene)** — start: the plain grey cloud background;
end: same paper torn in the lower half revealing the scene:

> Stop-motion paper collage animation. Invisible hands rip the grey cloudy paper apart in the lower half: the paper tears with jagged white torn edges that curl and flap outward, revealing a grey dull office with cubicles behind it. Fast violent tear in the first second, then the torn edges settle. Static camera, no camera movement, crisp paper texture.

Result: the torn edge rises like a curtain and settles by ~2 s. Use from 0.3 s.

## Using the clips

- Re-encode to 25 fps with `-g 5` (dense keyframes: hyperframes seeks without freezing).
- Extract the last frame (`ffmpeg -sseof -0.05 -i x.mp4 -frames:v 1 x_last.png`) and put
  it under the video in the scene — it holds the scene after the clip ends.
- `media.json`: `{"id": "unfold_remote", "src": "seed/unfold_remote_fast.mp4", "t": 6.30, "d": 2.0, "mstart": 0}`.
- Text starts appearing DURING the unfold (ref: "you're" over the ball); the cut-out
  person drops in exactly when the reveal completes; then the big word.
- Don't reuse the same effect twice in one piece: one unfold, one tear (memory rule:
  no repeated scene/clip).
- Ideas for more: a sheet crumpling INTO a ball as an exit; a torn strip peeling
  off the camera image; paper folding into the phone. Always: static camera, same
  background in both frames, "fast in the first second, then hold".

## One reveal per MEANING (Tanda 10 v2, 7 Oct 2026)

User: «dependiendo de lo que diga el vídeo, cambia las animaciones de papel… deben estar relacionadas con lo que
está diciendo». v1 reused the beach unfold for every paper scene. Library now in `edits/tanda10-papel/seed/`
(all from the same `seed_ball` start frame, V + 16:9; square = centre crop of 16:9 via `retime.sh <id>_h`):

| clip            | means                             | used for                                                             |
| --------------- | --------------------------------- | -------------------------------------------------------------------- |
| unfold_remote   | beach, 100% remote                | "trabajo 100% en remoto, +3.000 €, tu horario"                       |
| unfold_home     | cozy home office                  | "teletrabajo", "quedarse en su país trabajando en remoto"            |
| unfold_map      | world map with pins/routes        | "desde donde tú quieras", "empresas de EE. UU. y Europa contratando" |
| unfold_contract | signed offer letter               | "las condiciones que ofrecen"                                        |
| unfold_chart    | pop-up bars + yellow arrow        | "la demanda es tan alta"                                             |
| unfold_airport  | terminal window, plane taking off | "emigra"                                                             |
| tear_office     | grey cubicles                     | "tu trabajo actual el resto de tu vida"                              |

End frames: ask ChatGPT in ONE chat with `seed_ball.png` + an approved end frame attached ("mismo fondo, mitad superior
vacía, mismo agujero rasgado"); then «ahora en horizontal 16:9 igual» with `seed_ball_h_raw.png`. ~70 s per image.
Seedance: `seed2.sh NAME start end 9:16|16:9 "prompt"`; `retime.sh NAME [skip] [speed]`. The airport clip bursts the
ball at 0.25 s → skip 0.15 (clip 2.28 s). Drop the beach woman cut-out on non-beach reveals; use props that name the
sentence (house, plane, euros, stopwatch, laptop, globe).
