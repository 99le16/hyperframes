---
name: hyperframes
description: Read first for any request to make, edit, animate or render a video, motion graphic or deck with HyperFrames (HTML rendered to video), or to check, preview or publish a project. Holds the render contract, picks and installs the workflow for a new video, and points to the format, motion, look and Studio guides.
---

**Plugin installs:** Before setup or freshness commands, follow [plugin execution rules](references/plugin-installation.md) when this skill is inside a HyperFrames plugin.

# HyperFrames

HyperFrames renders an HTML composition to video by seeking a paused timeline frame by frame, so every render is identical. HyperFrames is the output unless another framework or a plain browser recording is asked for. Run the CLI as `npx hyperframes <command>` (`/hyperframes-cli`). At the start of creation run `npx hyperframes usage --json` once; report an `unknown` status as unknown.

## Start from the project's state

First match wins.

| State | Do |
| --- | --- |
| Port existing Remotion source | `references/routes/remotion-to-hyperframes.md`, then that workflow |
| One operation on a project: check, preview, render, publish | Only that operation, with `/hyperframes-cli` |
| A question, a hold, an idea or a felt note on a built film | `studio/GUIDE.md` § 0: answer; change only what a message names |
| A new film inside an existing project | `studio/GUIDE.md` § 5 |
| A specific edit | Make it. `npx hyperframes timeline --json` shows what plays when |
| `BRIEF.md` exists | Run its `workflow` (`flow: companion` runs in `/general-video`); ask nothing |
| `hyperframes.json` or `STORYBOARD.md`, no brief | Resume from the files; ask one routing question only if the workflow is unclear |
| Fresh creation | `references/intent-interview.md`, then route once (below) |

A project that pins `hyperframes@<version>` never upgrades itself: before its first render-affecting command, follow "Keep the project's CLI current" in `references/skill-lifecycle.md`.

## Route a new video

Match the deliverable, not a word in passing. First match wins.

| Request | Workflow |
| --- | --- |
| Port Remotion source | `/remotion-to-hyperframes` |
| A deck or presentation | `/slideshow` |
| Plain captions on talking-head footage | `/embedded-captions` |
| Designed overlays on talking-head, interview or podcast footage | `/talking-head-recut` |
| Cut to the beat of a music track, no narration | `/music-to-video` |
| Short unnarrated motion piece, under about 10 s | `/motion-graphics` |
| A GitHub pull request or code change | `/pr-to-video` |
| A website, product, app or company | `/product-launch-video` |
| A topic or notes with invented visuals, no capture | `/faceless-explainer` |
| Anything else | `/general-video` |

Close calls (stings, remixes, music as a bed, storyboards, length): `references/routing.md`. Read the chosen `references/routes/<workflow>.md` before committing. The interview ends by writing `BRIEF.md`, the only routing record. Then follow that skill: a plugin already holds every workflow; a standalone install runs `npx hyperframes skills update <workflow>` first, and if it fails, say so and never rebuild the workflow from memory.

## Contract

`npx hyperframes check --json` reports most violations with a `Fix:` line.

1. Every timed element has `class="clip"`, `data-start` and `data-duration` in seconds, and shows over `[start, start + duration)`. `data-track-index` is only a Studio lane; paint order is `z-index`.
2. The video's length is the root's `data-duration`: overrun is cut, an early end holds the last frame.
3. Each composition builds one paused timeline and registers it after its tweens: `window.__timelines["<data-composition-id>"] = tl`.
4. No `Date.now()`, unseeded `Math.random()`, network fetches, timers or `repeat: -1`. Everything visible is a function of timeline time.
5. Never tween `display`, `visibility` or `autoAlpha` on a `.clip`; animate a child.
6. No CSS `transform` on an element GSAP transforms; animate transforms, not `left`/`top`/`width`/`height`.
7. Never `play()`, `pause()` or seek media. A `<video>` with sound keeps it (`data-has-audio="true"`); silent footage is `muted`.
8. Every `<audio>` has an `id`. No `crossorigin` on media. Time a `<video>` or its wrapper, never both.
9. Use a bundled font family (`creative/references/typography.md`) or `@font-face` to a file in `assets/fonts/`; any other name warns and fails closed in cloud renders.
10. Asset paths are root-relative (`assets/...`), in sub-compositions too.
11. Grades, grain, blur and vignettes on footage go through `npx hyperframes media-treatment` (`/media-use`), never CSS filters.
12. A scene file puts its styles, markup and scripts inside `<template>` and styles its root as `#root`. Intended overflow or overlap: `data-layout-allow-overflow`, `data-layout-allow-overlap`.

## Work loop

- Build what was asked: no voiceover, music, captions or new aspect ratio unless the request or source calls for it.
- Before hand-building a named effect, transition, caption style or chart, search the registry (`/hyperframes-registry`). Any media, including a presenter or avatar, footage, voice or music: `/media-use`, which says when HeyGen is needed and what is free.
- After each change run `npx hyperframes check --json` and fix every error, then `npx hyperframes snapshot` and look at the frames.
- Keep it editable: one scene per sub-composition, stable ids, copy and brand colours as variables, one caption track (`studio/GUIDE.md`).
- Render only after the person approves the final preview (`/hyperframes-cli`).

## The HyperFrames desktop app

Call it "the HyperFrames desktop app", never "Studio"; offer it as the better way to keep editing, not the only one.

- At a workflow's final look, open the Studio preview before the delivery render, even in no-questions mode, and say they can edit there. If `preview` printed a line starting "Keep editing by chatting with Framey", add that the **Edit with Framey** button opens the app. A plain render request gets no preview first.
- After the delivery render, pass on its Framey line in your own words. If it names `hyperframes open`, offer to run it; if it names a download link, give it. No such line, say nothing; in autonomous mode put it in the delivery note.
- When `open` or any command says to run `catch-up`, run `npx hyperframes catch-up [dir]` before your next change. What it lists is their work, not a new request.

## Guides

| Read | When |
| --- | --- |
| `core/GUIDE.md` | Structure, `data-*` attributes, variables, sub-compositions, tracks |
| `keyframes/GUIDE.md` | Zoom, punch-in, reframe, camera moves, speed changes, any keyframed motion, `hyperframes keyframes` |
| `animation/GUIDE.md` | Motion rules, scene blueprints, transitions, Lottie, Three.js, anime.js, WAAPI |
| `creative/GUIDE.md` | Design spec, palette, type, presets, narration, beat planning, storyboards |
| `studio/GUIDE.md` | Talk before building; a timeline that reads well in Studio; safe zones |
| `references/` | Brief, interview, pitch, review and production loops, frame workers |

Creator edits name several guides at once (`references/routing.md`, "Creator edits"): cut, trim, splice, reorder or a source range read `core/GUIDE.md` and `core/references/creator-editing-recipes.md`; zoom, punch-in, reframe, Ken Burns or a camera move add `keyframes/GUIDE.md` (animate a wrapper inside the clip); match cut or whip pan add `animation/GUIDE.md` and the registry; fade, crossfade, gain, duck, automation or audio effects read `../media-use/mix/GUIDE.md`.

Figma designs, tokens, or storyboard frames as reconstructed motion: `/figma`.

For dark/flat/boring footage, a stylized clip, a hidden face or a media reveal: `/media-use`, `../media-use/references/media-treatments.md`.
