# Envato stock, memes, real channel cards

## Envato (licensed per project)

- Use the `envato-stock` skill: search (MCP `mcp__envato__search_stock_video` / `search_music` / `search_sound_effects`),
  pick by the spoken LINE, download with its `grab_download.py` in the user's browser session, licence under the PROJECT
  name. Never reuse another project's licence silently — say it in the report.
- Picks file `work/sourcing/stock_picks.json`: `{id, s, e, line, primary{title,author,url}, alternate}`; files
  `work/sourcing/stock/<id>.mov|mp4`. 2–3.5 s each, on concrete nouns. compose: cover-crop to 16:9, 7 % push, contrast 1.06.
  The planner skips a pick that would land on a full scene or leave a camera crumb < 2 s.
- Music: Claim Clear only. The MCP's claim_clear filter is ignored → search in the web app
  `app.envato.com/search?itemType=music&term=…&filter.claim_clear=compatible` and download from the row icon.
- Brave/Chrome save dialog: the download lands in the browser's last-used folder (envato-stock skill handles it).

## Memes / film clips (yt-dlp)

```bash
yt-dlp "ytsearch6:<query>" --skip-download --print "%(duration)s | %(id)s | %(title)s"
yt-dlp --extractor-args "youtube:player_client=web_embedded,mweb" -f "bv*[height<=1080]+ba/b" --merge-output-format mp4 -o "src/%(id)s.%(ext)s" "<url>"
```

- 403 on the default client → `player_client=web_embedded,mweb` (or tv/ios). cropdetect every film upload (baked letterbox),
  crop channel bugs, 2.5–5 s, keep its own audio (`.wav` beside the mp4) but MUTE loud ones (the user: Stonks «suena demasiado
  fuerte, quítale el sonido» → music.json mute_memes). A small chip names the source ("Meme «This is fine»", "Matrix (1999)").
- Trading-13 set: Wolf of Wall Street mansion (lujo), Futurama (creyéndose todo), Matrix "I know kung fu" (tutorial de 2
  semanas), Stonks (dos semanas → rico), Gatsby toast (campeón en demo), This is fine (no le duele).
- Licence: film clips are not licensed — mention it.

## Real channel-video cards

Every "te dejo un vídeo / en el canal / aquí arriba" → find the real video on the channel (brand-and-intake.md), download
`maxresdefault.jpg`, and show `YTD({id, title, dur, t, out})` or `L.videoCard({thumb:'../yt/<id>.jpg', title, dur})` from when he
starts mentioning it. Exact title, real duration. If he promises a video that doesn't exist yet → no card (don't fake one).
Trading-13: swing → «Si tienes TRABAJO, esta estrategia de Trading es para ti» (Oat5WzjRnsw 24:02); prop firms → «La VERDAD
sobre las Prop Firms: Elige Bien Antes de PAGAR» (S0VdP9F4Qfg 10:17); su método → «Mi MÉTODO de trading explicado desde CERO»
(nLmvyEnx4lE 25:20); cuentas fondeadas → «No operes más: así se pasa una cuenta fondeada con cabeza» (YJvQF2ATuU8 11:44).
