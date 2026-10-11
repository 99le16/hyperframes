# Reference videos and how to study one

```bash
mkdir -p ref && cd ref
yt-dlp --no-update --extractor-args "youtube:player_client=web_embedded,mweb" -f "bv*[height<=1080]+ba/b" --merge-output-format mp4 -o "ref.%(ext)s" "<url>"
ffmpeg -i ref.mp4 -vf "fps=1/3,scale=320:-1,tile=8x7" sheet_%02d.jpg        # whole video
ffmpeg -ss <t> -t 24 -i ref.mp4 -vf "fps=4,scale=240:-1,tile=12x8" seq.jpg  # how a transition really moves
```

A stalled screenshot is not watching it — download and sheet it at once. Measure (don't eyeball): cut rate, camera share,
type sizes/positions at full resolution.

| Reference                                                                                          | What we took                                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Iman Gadzhi «You're Not Late (Yet): Learn 98% of Gemini» `_FGrUBi7Zno`                             | camera-first rhythm, glass cards, capsules, flat avatar illustrations, PiP windows, YouTube UI CTA      |
| Iman Gadzhi «The Best AI Side Hustles To Start In 2026» `q1g65sjQI-4`                              | 3D icon carousel chapters, illustrated 3D heroes with MG on top and push-through transitions, tier list |
| Under The Radar «How to Create Content No One Else Can» `ttdBbHyK7yE`                              | cinematic dark 3D (chess, arcade), DOF, rim light, light streaks                                        |
| papel v6 reel (`conquer vídeos/pruebas/Tanda 10 EDITADO/EU AD3 Hook B - Reel 9x16 - papel v6.mp4`) | key-word typography behind the head, typewriter + highlight, SFX palette                                |
| The finished example                                                                               | `conquer vídeos/pruebas/vídeo largo/vídeo largo EDITADO v13.mp4`, project `edits/trading-13/work/v11`   |
