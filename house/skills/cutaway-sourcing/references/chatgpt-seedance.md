# Generate a picture, then make it move

Two stages, two different scripts, and the second one is optional.

1. **`scripts/gen_images.py`** — gpt-image (`gpt-image-2` / `gpt-image-1.5`)
   draws the asset: a cut-out with transparency, an object, an illustration, a
   full-frame explanatory picture. Every call writes a sidecar with the prompt,
   model and parameters, because a picture nobody can re-derive is a picture
   nobody can revise.
2. **Motion.** Either the asset is laid out and pushed around _in code_ —
   positions, typography, house easing — or it is handed to Seedance and comes
   back with motion no code can fake: camera drift, parallax, cloth, hair,
   water, smoke. `scripts/animate_seedance.py` is the second path.

Reach for Seedance when the shot must **move on its own**. Reach for code when
the motion is type and layout over a static drawing. Most plates are the second
kind; Seedance costs credits and code does not.

## Setup — once per machine, not once per edit

Seedance runs through the **`higgsfield` CLI** (npm `@higgsfield/cli`):

```bash
npm install -g @higgsfield/cli
higgsfield auth login            # browser OAuth against your normal account
higgsfield workspace list
higgsfield workspace set <id>    # required before any generation
```

The login is cached by the CLI itself, not in any repo, and persists across
sessions.

**Do not use Higgsfield Cloud.** `api.higgsfield.ai` with the key pair
`HF_API_KEY_ID` / `HF_API_KEY_SECRET` is a _separate developer account_ with its
own billing that starts at zero credits — `cloud.higgsfield.ai` will show 0 even
when the app subscription has thousands, because it is not the same account.
The CLI logs into the same account as the web app and spends the same
subscription balance; Higgsfield's own docs say so ("Your existing Higgsfield
plan credits work seamlessly through any connected agent") and `higgsfield
account status` after login confirms it against the real balance. The Cloud-API
route was the first thing tried on this project and it hit an empty balance.
Do not resurrect it, and do not add API-key plumbing to the script.

## What a shot costs

Measured with `higgsfield generate cost <model> --prompt t --resolution R
--duration D`. Confirmed again 17 Sep 2026 on CLI 1.1.24 — the 1080p figures
below are unchanged since 5 Sep 2026.

| model                | 720p | 1080p  |
| -------------------- | ---- | ------ |
| `seedance1_5` (4 s)  | 4.8  | **12** |
| `seedance_2_0` (5 s) | 22.5 | 45     |
| `seedance_2_5` (5 s) | 32.5 | —      |

`seedance1_5` is the cheap tier and it only accepts durations of **4, 8 or 12
seconds** — the API rejects anything else. Use it whenever a budget is stated:
four 1080p shots come to 48 credits, which is what one programme's intro spent
against a 70-credit cap. `seedance_2_0` is the default in the script; pass
`--model seedance1_5` to drop the bill by nearly 4×.

## Usage

```bash
# one asset, animated, landed straight in broll
python3 scripts/animate_seedance.py assets/ai/brain.png \
    --prompt "slow gentle rotation, soft studio light drifting across the surface" \
    --out assets/broll/B31.mp4 --duration 5 --aspect-ratio 16:9

# a whole set from a spec file
python3 scripts/animate_seedance.py --spec work/seedance_shots.json --out-dir assets/broll
```

`--dry` prints the work-list and calls nothing, which is how you check a spec
before spending anything. Each finished shot writes a `<name>.gen.json` sidecar:
id, prompt, model, params, the CLI job id and the source `result_url`.

## The trap: a transparent cut-out is a quarter halo

A `--transparent --trim` asset is trimmed to its **alpha** bounding box, not to
its ink. The model bakes a soft glow around the subject, so the box is much
bigger than the drawing: on two assets drawn for one thumbnail, the trimmed box
was 1516×1024 while the drawing inside it was 1173×763 — a ~25% margin of
near-invisible pixels on every side. Place by the PNG's edges and "bleed this
off the bottom edge" leaves a visible gap.

`opaque_pct` in the manifest does not catch this. It tells you the cut-out
worked, not how much of the box is halo. The measurement that matters is the
bbox of alpha above ~128 against the bbox of alpha above 0.

**Fix, before compositing:** curve the halo out — alpha ≤70 → 0, ≥185 → 255,
linear between, which keeps the antialiased edge — re-crop to the new bbox, and
position by _that_ box.

**And normalise the accent colour across a set.** Two prompts naming the same
red came back `#FA0F0E` and `#ED0000`. The model is not colour-managed; the edit
has to be.
