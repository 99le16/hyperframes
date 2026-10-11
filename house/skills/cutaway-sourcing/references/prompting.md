# prompting.md — how to ask for an asset that composites

Read this when writing `work/ai_assets.json`. Everything here is either measured
on real generations for this skill or carried over from the editorial standard in
`talking-head-edit/references/craft.md`.

---

## The shape of a prompt

Four clauses, in this order. The order matters — the model weights the opening
strongly, so the _kind of image_ has to come first, not the subject.

```
<form>          Flat minimal vector icon
<subject>       of a stylised brain made of connected nodes,
<palette>       single bright green #4ADE80 line art,
<ground>        isolated on a fully transparent background. No text, no letters,
                no words, no shadow, no ground.
```

**Form** decides more than anything else: `flat minimal vector icon` ·
`editorial diagram` · `isometric illustration` · `technical line drawing` ·
`abstract texture` · `photoreal product shot on a seamless backdrop`. Two assets with
different form clauses will never sit in the same frame together.

**Ground** is the clause people forget. For a cut-out you need all four negatives
— _transparent background, no shadow, no ground, no reflection_ — because a baked
drop shadow lives in the alpha channel and will read as grey mud on a near-black
plate.

## Negatives that earn their place

| write                                 | because                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| `No text, no letters, no words.`      | every image model still sets type badly; the words go in `animate_assets.py` |
| `no shadow, no ground, no reflection` | all three survive into the alpha and dirty the composite                     |
| `no gradient background, no vignette` | the plate's ground is `#0a0a0a`; anything else fights it                     |
| `not glowing, not neon`               | the default "AI/tech" look is a blue glow, and this house style is not that  |
| `no people, no faces, no hands`       | when the subject is an object, a stray hand changes what the shot claims     |

## The house style, as a clause you can paste

> `Flat, minimal, high contrast, on a near-black #0a0a0a ground. Cool neutral
greys, one single accent of green #4ADE80 used sparingly. No text, no letters,
no words. No glow, no gradient background, no vignette.`

For cut-outs, swap the ground clause for `isolated on a fully transparent
background, no shadow, no ground`.

## Keeping a set consistent

This is the failure you will actually hit. Two icons written as two independent
prompts came back — measured, first pair drawn for this skill — as a **thick
saturated green line drawing** and a **thin blue-grey one**. Side by side in one
frame they read as two clip-art packs.

The fix is `ref`:

```bash
# 1. the first one, on its own
python3 <skill>/scripts/gen_images.py "Flat minimal vector icon of …" \
    --out assets/ai/brain.png --transparent --trim

# 2. look at it. Then every other asset in the set references it:
python3 <skill>/scripts/gen_images.py \
  "A microchip icon in exactly the same line weight, palette and flat style as \
   the reference image, isolated on a fully transparent background. No text." \
  --ref assets/ai/brain.png --out assets/ai/chip.png --transparent --trim
```

This routes through `/images/edits` with the approved asset attached, and the
result matched line weight and palette closely enough to sit in the same frame.
In a spec file the same thing is a `"ref": ["assets/ai/brain.png"]` key.

Describe **only what changes**. "A microchip in the same style" works; re-stating
the whole style brief alongside a reference gives the model two authorities and it
splits the difference.

## Sizes

| `size`      | for                                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| `1024x1024` | cut-out assets — square gives the object room in every direction, and `--trim` throws the rest away   |
| `1536x1024` | full-frame explanatory images and backdrops (16:9-ish; `animate_assets.py` covers-and-crops the rest) |
| `1024x1536` | tall subjects, vertical deliveries                                                                    |

A full-frame backdrop generated at `1536x1024` is scaled up to a 1920 or 3840
frame. That is fine for soft, low-detail scenes and visibly soft for detailed
ones — if the plate is detailed and fills the screen, it wants `high` quality, or
it wants to be a gfxlib graphic instead.

## Quality

- `low` — layout tests, deciding whether a composition works at all. ~10 s.
- `medium` — the working default for a plate that is one element among several.
- `high` — a frame that fills the screen and holds for seconds.

Draft at `low`, settle the scene, regenerate the keepers at the quality they need.
The prompt and every setting is in the sidecar, so a regeneration is one flag
change.

## What not to ask for

- **Charts, dashboards, UI, anything with numbers or labels.** Plausible and
  wrong. Those are gfxlib modules — `b03_seodash.py`, `b09_index.py`.
- **Logos and brand marks.** A generated logo is a wrong logo. Set the wordmark in
  type; `tools/graphics/aiswap.py` is the worked example.
- **Real people, real places, real products.** If the edit needs a filmed thing,
  license it through `/envato-stock`.
- **A composed layout ("three cards in a row, the middle one highlighted").** The
  model will get the count or the emphasis wrong, and a single flattened image
  cannot animate per element. Generate the pieces; compose in the scene file.

  The exception is a **backdrop** whose whole job is to sit behind type and never
  move independently — there a composed generated frame is exactly right.
