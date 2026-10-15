# Routing: close calls

The routing table is in the entry skill (`../SKILL.md`, "Route a new video"). These settle the cases it leaves open.

- A short animated title, logo sting, stat hit, chart hit, map hit, or standalone lower-third is `/motion-graphics` when it is unnarrated and motion is the message. A static title card, narrated sequence, longer montage, or custom loop is `/general-video`.
- An explicitly short motion graphic may use a URL, tweet, article, or screenshot as source material. A generic "make a video from this site" request is `/product-launch-video`.
- Existing footage with captions routes to `/embedded-captions`; footage with designed information cards routes to `/talking-head-recut`. Retiming, reordering, recoloring, reframing, or remixing footage is a custom edit and falls through to `/general-video`.
- A music file selects `/music-to-video` only when its beat grid drives the piece. Music used as a bed does not override the subject-matched route.
- "I want a storyboard" changes the review process, not the workflow. With no other routing signal, use `/general-video`. A confirmed board (`boards/storyboard.html`, format in `../creative/references/storyboard-recipe.md`) may itself be the requested deliverable; the review loop defines that stop point.
- Specialized narrative workflows support up to about 3 minutes and are strongest around 30–90s. Route a clearly longer piece to `/general-video`. Length never overrides an explicit port, deck, caption, overlay, or music-driven deliverable.

## Creator edits

Creator edit phrases are cross-domain requests. Load every guide named in the matching row.

| Creator request                                                                                                    | Required domains                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “cut this footage”, hard cut, trim, splice, reorder, or use a source range                                         | `/general-video` + `../core/GUIDE.md`; core owns `data-start`, `data-duration`, `data-media-start`, and track layout.                                                                     |
| zoom in here, punch-in / punch-out, smooth multi-state zoom or reframe, Ken Burns, or camera move                  | `/general-video` + `../core/GUIDE.md` + `../keyframes/GUIDE.md`; animate the inner visual/crop wrapper, not the timed clip.                                                               |
| match cut or whip pan camera transition                                                                            | `/general-video` + `../animation/GUIDE.md` + `../keyframes/GUIDE.md` + `/hyperframes-registry`; search/install a transition primitive before hand-authoring.                              |
| fade, crossfade, track gain/volume, automation, duck/carve, audio effects, or one effect across several tracks     | `/general-video` + `../core/GUIDE.md` + `../../media-use/mix/GUIDE.md`; core places clips, audio mixes placed tracks — including a submix bus over a group of them.                       |
| picture and sound edits that combine cuts with camera motion or mixing                                             | `/general-video` + `../core/GUIDE.md` + `../keyframes/GUIDE.md` when there is visual motion + `../../media-use/mix/GUIDE.md` when sound is faded, mixed, ducked, automated, or processed. |
| lay out a project so it reads well in Studio: caption track, tracks per element kind, sub-compositions, safe zones | `../studio/GUIDE.md` + `../core/GUIDE.md`; studio owns the layout conventions, core owns each edit.                                                                                       |
| source or generate media, or preprocess an unsupported mid-source freeze                                           | `/media-use`; sourcing/generation/preprocessing only, never placed-track mixing.                                                                                                          |

Constant `data-playback-rate` is render-safe for picture and pitch-preserved
sound. Speed ramps are a `rate` lane in `data-automation`.

For copyable edit contracts, read `../core/references/creator-editing-recipes.md`.
