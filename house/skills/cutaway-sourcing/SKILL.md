---
name: cutaway-sourcing
description: Decide where the picture for a spoken line comes from, and get it. Four routes — licensed stock, the real clip downloaded with yt-dlp, a generated image animated with Seedance, or a schema drawn in code — with the rule for choosing between them and the traps each one hides. Use when a narration line needs something on screen and it is not obvious what, when stock searches keep coming back generic, when a line names a specific film scene or viral clip, when a joke needs a meme beat, or when a shot has to move in a way code cannot fake.
---

# cutaway-sourcing

A talking-head edit is a sequence of decisions about what to put over the voice.
Most of the cost is not in the compositing — it is in choosing the route before
you spend an hour on the wrong one. This skill is that decision, plus the
failure modes each route hides.

Written from production: ~15 Spanish-language explainer edits between June and
September 2026, most of them 30 s to 31 min, all cut against a reference.

## The four routes

Read the line. Ask what kind of thing it points at.

| The line points at                                                                                                                             | Route                                                       | Why                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Something generic that exists in the world — a tattoo artist working, cadets at drill, a laptop on a hostel balcony                            | **Licensed stock**                                          | It is real footage, it is cleared, and nothing about it needs to be _that_ particular one             |
| Something specific that exists and everyone can check — a named film scene, the actual clip circulating on TikTok, a product's own launch page | **The real thing, downloaded** (`references/yt-dlp.md`)     | Stock is generic by construction; a generated version of a real thing is a fabrication                |
| A metaphor, a joke, a feeling — "it was a tremendous pain", the "wrapper" insult, frustration at a builder UI                                  | **Generate and animate** (`references/chatgpt-seedance.md`) | Nothing can film it and no diagram carries it; this is also the meme beat — see `references/memes.md` |
| Numbers, dates, relations, a mechanism — 80 M$, a growth curve, three boxes and two arrows                                                     | **A schema drawn in code**                                  | Type set by a model is unreliable and unrevisable; type set in code is neither                        |

Two rules that override the table:

- **Never generate a photoreal picture of a real person, place or product.**
  Buy it, download it, or capture the real page. A generated Wix homepage is a
  lie about a company; the Wayback capture of the real one is a citation.
- **Never let a model set type.** Every word on screen is drawn in code, from
  the transcript. A model's lettering is wrong often enough that checking it
  costs more than setting it.

## The order to work in

1. **Map the beats against the transcript first**, with word timings. Not
   against the prose plan — authoring beats from the plan lands every one 1-6 s
   ahead of the voice, because the plan has no idea how fast the sentence is
   actually spoken.
2. **Decide the route per line**, using the table. Write it down before
   sourcing anything.
3. **Source in cost order**: schemas are free, downloads cost a minute, stock
   costs a licence, generation costs credits. Generate last, when nothing else
   can carry the line.
4. **Verify every plate against its own sentence** before rendering. A plate
   that matches the section but not the sentence reads as a mistake, and it is
   the single most common defect in a first pass.
5. **Verify any number a plate carries against the live source.** A graphic
   turns a stale spoken figure into what looks like a citation. Grep the source
   page for the literal digits. Where the narration is wrong and the plate is
   right, the plate carries the true dates and does not stamp the slip on
   screen.

## References

- `references/chatgpt-seedance.md` — generate a PNG with gpt-image, then give it
  real motion with Seedance through the Higgsfield CLI. Setup, credit costs,
  which tier, and the alpha-halo trap that makes every placement land loose.
- `references/yt-dlp.md` — download the real clip. The three traps (403, the
  wrong rung on a vertical video, the landscape triptych) and how to find the
  exact frame inside a long clip without scrubbing.
- `references/memes.md` — the meme beat: when a joke needs a drawn picture
  rather than a graphic, and why a licensed impact sound lands 0.45 s late.

## Scripts

- `scripts/fetch_clip.py` — find and download the real clip. `--search` lists
  candidates without downloading, `--formats` reads the rungs, and a fetch picks
  the rung by pixel area (never by height), falls back through player clients on
  a 403, runs `cropdetect` on what it got, and writes a sidecar. Needs `yt-dlp`
  and `ffmpeg`; no key, no account.
- `scripts/gen_images.py` — gpt-image generation with manifest sidecars, so a
  picture can be re-derived and therefore revised.
- `scripts/animate_seedance.py` — hands one PNG to Seedance and returns an mp4
  plate. A thin wrapper over the `higgsfield` CLI; there is no API key to
  manage, and there should not be one (`references/chatgpt-seedance.md` says
  why).
