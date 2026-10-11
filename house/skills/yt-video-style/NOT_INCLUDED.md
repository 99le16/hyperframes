# Files left out of this public copy

- `assets/sfx/` — the same sound palette as `ad-style` (`pop_a.wav pop_b.wav sub_swoosh.wav swoosh_fast.wav tick.wav tock.wav typing.wav user_click.wav whoosh_big.wav whoosh_fast.wav whoosh_standard.wav whoosh_wave.wav`),
  Envato-licensed. `scripts/new_project.sh` creates an empty `sfx/` and
  `engine/mix.py` reads these names from it.
- `assets/fonts/satoshi/` — Satoshi (Fontshare) is free to use but its files
  are not ours to redistribute. Download it from fontshare.com into
  `assets/fonts/satoshi/Satoshi_Complete/Fonts/OTF/` (Bold, Medium, Black);
  without it the CSS falls back to Helvetica Neue / sans-serif.
- `assets/ref_avatar_flat_user.jpg` — a photo of the presenter used as the
  likeness reference for the flat 2D avatars. Use a photo of your own presenter.
- The brandbook the skill reads first
  (`https://claude.ai/artifact/Pxdw15YKEar51KYSrG2xhC`) is a private Artifact of
  the Conquer channels. Without access, give the agent your own brand colours,
  typefaces and logo in `project.json` instead.

## Resized to fit this repo

The repo rejects binaries over 500 KB that are not in LFS, so the 23 glossy
tiles in `assets/tiles/` (originally ~830–920 px) and the two
`ref_avatar_flat_*.png` style references (originally 1920×1080) are stored
here downscaled, losslessly, to the largest size under that limit (~650–760 px
tiles, ~1000 px references). The engine reads the tiles as textures and does
not depend on their pixel size.
