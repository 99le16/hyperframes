# Intake and brand

## The questions (one AskUserQuestion call, before touching the footage)

1. **Canal** — "¿Cómo se llama el canal?" The answer picks the brand (Conquer Finance, Conquer Blocks, Conquer Business,
   Conquer Languages, Conquer AI, Conquer Kids, Legal, ConquerX…). If the user names a channel that is not in the brandbook, ask
   for its colours/fonts or a link to its brand material.
2. **Estilo** — "Igual que 13 años en trading" (default) / más cámara / más 3D. Adjust density targets in beat-planning.md.
3. **Subtítulos** — default: only key words, papel yellow #FAF400. The user explicitly asked to keep subtitles yellow and use
   the brand colours for backgrounds and for text inside the new motion graphics. If they choose brand-coloured subtitles,
   set `subtitle_color` to the first gradient stop.
4. **Recursos** — Envato / memes / ChatGPT+Higgsfield / 3D / cards. Ask about Higgsfield credits if heroes are wanted
   (`higgsfield account status`; Seedance 1.5 1080p ≈ 12 credits per 4 s, 24 per 8 s — tell the user the estimate; they
   have said «si necesitas más tokens de higgsfield me avisas»).

Also ask for (or find): the raw cut path, the reference video if a new one, where to deliver.

## The brandbook artifact

URL: https://claude.ai/artifact/Pxdw15YKEar51KYSrG2xhC ("Conquer Lab" design system; one entry per academy).
`Artifact` `action: read` returns a summary and saves the raw HTML (≈12 MB, rendered by JS — the summary is useless, the HTML
has the data). Then:

```bash
python3 .claude/skills/yt-video-style/scripts/brand_lookup.py <saved.html>                 # list: conquerx, blocks, business, languages, finance, legal, ai, kids
python3 .claude/skills/yt-video-style/scripts/brand_lookup.py <saved.html> "Conquer Finance"
```

Output (Finance, verified 7 Oct 2026):

- fonts: DM Sans 600 (headings), Bodoni Moda 600 (editorial serif)
- gradient «Finance (actual)»: #AED916 → #74CD2D → #3AC043 (cartuso · lima · esmeralda), angle 120°
- bg negro (dark mode), paper crema allowed, grid, glow, glass («vidrio») accents, texture «bolsa» (stock market)
- emblem `caballo-ajedrez` (chess knight) — + candado, dinero3
- claims: «26M$ + capital fondeado por la comunidad», «Opera con capital de firmas propietarias sin arriesgar tus ahorros»
- note: «Verdes actuales. Papel y grid como Blocks, sin píxeles. La textura bursátil solo va sobre color u oscuro.»

Other brands found: Blocks (Funnel Display / Press Start 2P…, #FFBF00→#FF8000→#FF4000, pixels, emblem codigo),
Business (IBM Plex Serif…, #4B92CC→#1D5089→#0B2442, light), Languages (script fonts, #6CA5BC→…, light), Kids (Quicksand, blue/
violet + yellow/orange, light), AI (shares Blocks fonts/gradient), ConquerX (Termina, greys).

## Map the brand into the edit

`work/style/project.json`:

```json
{
  "duration": 859.58,
  "fps": 30,
  "master": "../../master.mp4",
  "brand_gradient": ["#AED916", "#74CD2D", "#3AC043"],
  "subtitle_color": "#FAF400",
  "brand_text_ids": [],
  "trims": {},
  "animated_avatars": []
}
```

- lux.js reads it (via `window.PROJECT` in `_slots.js`): ids starting with `X` (3D/MG inserts) + `brand_text_ids` get the brand
  gradient (L.Y = stop 1, L.GRAD, CSS --grad/--g1..3); everything else (subtitles) uses `subtitle_color`.
- 3D kits read `L.G` / `BRANDN` → floor glow, emissive accents, rings, extruded text in the brand colours.
- Dark brand (bg negro): black stage, subtle grid, glow. Light brand (Business, Languages, Kids): rethink the 3D stage
  (cream paper floor, soft shadows) — the kits assume dark; tell the forks.
- Emblem: use the brandbook's emblem as a recurring 3D object (Finance → the Poly Haven chess knight; for others search Poly
  Haven or build it — motion-3d.md).
- Fonts: Helvetica Neue stands in for geometric sans (DM Sans); load the brand font from Google Fonts only if the user asks.

## The channel (real video cards, avatar)

```bash
yt-dlp --no-update "ytsearch8:<Channel name> <topic>" --flat-playlist --print "%(channel)s | %(channel_url)s | %(title)s | %(id)s"
yt-dlp --no-update --flat-playlist --print "%(title)s | %(id)s | %(duration)s" "https://www.youtube.com/channel/<UC…>/videos"
curl -sf -o yt/<id>.jpg https://i.ytimg.com/vi/<id>/maxresdefault.jpg || curl -sf -o yt/<id>.jpg https://i.ytimg.com/vi/<id>/hqdefault.jpg
```

Conquer Finance = `UCjk40Vcj_CdXNdu5t_2q9Rw`. Some titles come back auto-translated to English — use the Spanish ones or
check the video page. Channel avatar: a round crop of the logo on the studio wall or the channel's own avatar.
Note: the user's personal channel for other projects is «ConquerAI» (memory) — never the presenter's name.
