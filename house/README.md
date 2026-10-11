# house/ — production learnings, added on top

This directory is **additive**. Nothing outside it has been touched: no upstream
file is modified, moved or deleted, and `skills-manifest.json` is untouched
because the manifest is generated from `skills/` and a new directory there would
put its CI check (`gen:skills-manifest --check`) out of sync.

What is here is what came out of actually shipping edits — roughly fifteen
Spanish-language explainer videos cut between June and September 2026, from
30-second vertical shorts to a 31-minute programme, each graded against a
reference. Some of it is knowledge the upstream skills do not cover; some of it
is a deliberate divergence from them.

## What is in it

### `skills/cutaway-sourcing/`

Where the picture for a spoken line comes from, and how to get it. Four routes —
licensed stock, the real clip downloaded, a generated image given real motion, a
schema drawn in code — with the rule for choosing and the traps each hides.

- `references/chatgpt-seedance.md` — gpt-image → Seedance through the
  `higgsfield` CLI. Which tier and what a shot costs (verified 17 Sep 2026),
  why the Cloud API is the wrong account, and the alpha halo that makes every
  cut-out placement land ~25% loose.
- `references/yt-dlp.md` — downloading the real clip: the 403, the wrong rung
  on a vertical video, the landscape triptych, baked letterbox on film uploads,
  and how to find the exact frame without scrubbing.
- `references/memes.md` — the meme beat, and why a licensed impact sound lands
  0.45 s late unless you measure its peak.
- `references/prompting.md` — how to ask gpt-image for an asset that actually
  composites. Carried over unchanged from the source project, so it still refers
  to `talking-head-edit/references/craft.md`, which lives in that project and
  not here.
- `scripts/fetch_clip.py` — search, list rungs, download with the client
  fallback and a crop report. Verified end to end 17 Sep 2026 on yt-dlp
  2026.07.04.
- `scripts/gen_images.py`, `scripts/animate_seedance.py` — the working scripts,
  copied verbatim. All three are self-contained (stdlib only, plus `yt-dlp` /
  `ffmpeg` for the first and the `higgsfield` CLI for the third) and none of
  them carries a key.

### `skills/hand-drawn-canvas-animation/`

Hand-drawn short films in JavaScript + Canvas 2D: whole-pose drawings,
expressive strokes and intentional exposure (on twos/threes) in ink, pencil,
risograph, screen print or brush-pen doodles over photos; also rotoscope, sand
animation and pop-up paper. Built on Alexey Fateev's MIT-licensed original
(`LICENSE` kept in the directory).

### `skills/envato-stock/`

Find, license and download Envato Elements stock video and photos into a
folder: search through the Envato MCP, license and download through the user's
own logged-in browser (the MCP cannot download). `scripts/grab_download.py`
files the download from the browser's save dialog and guards against the
double-fire that files the previous clip under the new name.

### `skills/guion-divulgativo-ia/`

Spanish-language YouTube scripts about AI in one fixed narrative shape: open on
a historical scene everyone knows, ask an open question about machines, climb a
ladder of examples from the old and silly to recent studies with a date and a
figure, qualify ("para ser claros"), close back on the opening character and a
call to action. Text only — it does not record, edit or voice.

### `skills/ad-style/`

A vertical talking-head ad / reel recipe signed off on a real client batch (39
reels in three formats): giant yellow words behind the presenter's head (person
matte), white caption pills, a jump-zoom on every sentence, full-screen paper
collage scenes (navy grunge paper with typewriter titles and spiral notepad
cards; grey paper that unfolds or tears open, generated as start/end frames and
animated with Seedance), a clock behind the head and a phone push-in. Includes
the spec-driven engine (`templates/`), the preview / cue / mix / final scripts,
a batch runner, and audits that fail a render when a word sits outside the safe
area or under the caption band. See `NOT_INCLUDED.md` for the licensed sound
palette and the reference reel, which are not shipped.

### `skills/yt-video-style/`

Long-form (8–30 min) talking-head YouTube edits in the "Iman Gadzhi / Under The
Radar" register: a reframe every ~4 s with snap-zooms and whips, key words
behind the head, real Three.js 3D motion graphics in the channel's brand colours
(glossy tile carousels, extruded numbers, coin stacks, pillars, a Poly Haven
chess knight), generated illustrations animated with Seedance with graphics
glued on top, stock and memes, and music that follows the script. Ships the
engine (`scripts/engine/`: planner, 3D kits, renderer, compositor, mixer) and a
project bootstrapper. See `NOT_INCLUDED.md` for what is left out (licensed SFX,
Satoshi, a presenter photo, a private brandbook).

## One deliberate divergence from upstream

`skills/media-use` refuses platform pages on purpose — its ingest takes a direct
media URL or a local file, and `resolve.mjs` says so in as many words: _"no
platform pages / yt-dlp"_. `cutaway-sourcing` documents the yt-dlp route anyway,
because a line that names a specific film scene or a specific viral clip cannot
be served by stock or by a generated picture without fabricating it. The two
are not in conflict — one is an ingest contract, the other an editorial
decision about what a shot has to be — but the difference is intentional and
worth knowing before wiring them together.

## Wiring it in

These skills are not registered with the CLI. To register them, they would have
to sit in `skills/` and the manifest would have to be regenerated:

```bash
bun run --cwd packages/cli gen:skills-manifest
```

That regeneration rewrites `skills-manifest.json`, which is why it has not been
done here. Until then, read the files directly, or point an agent at
`house/skills/<name>/SKILL.md` by path.

## Not here yet

The source project holds ~90 more production notes that are not in this
directory, because they are about its own ffmpeg pipeline rather than about
sourcing: caption rendering (PIL's stroke silently deleting accents on capital
letters, zero-duration Whisper words, the em-box anchor), timeline drift
(segments cut with `-ss/-t` running 0.57 s long over an uncut audio spine,
overlays authored from a plan landing seconds early), audio (sidechain defaults
that make a bed inaudible on a wall-to-wall take, a music stem that is silent
because its instrument has not entered yet), and render mechanics
(`build_overlay` dying with an empty stderr past ~100 inputs, `ffmpeg concat`
skipping a broken segment and still exiting 0). Say the word and they can be
written up the same way.
