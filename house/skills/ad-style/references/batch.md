# Many reels from raw multi-take sets (Tanda 10, 6 Oct 2026)

User request: "haz exactamente esto con este estilo con el resto de reels del documento que se puedan hacer con los vídeos
largos… crea todas las versiones". Answer to scope: **every reel must be complete (hook + body + CTA)**; a reel with several
hooks → one reel per hook. Missing pieces → reuse the unified CTA the doc itself declares shared (AD2 EU/LATAM CTA).

## Pipeline (`batch/` — copies of edits/tanda10-papel)

1. Read the doc and the set transcripts (`tanda10-reels/work/tr_set*/`), pick the CLEAN last take of each module
   (announced aloud: "AD4VA Europa HUC C… repito"). Snap spans to audio dips, then **trim each piece to first word −0.15 s /
   last word +0.28 s** (dead air between takes kills the pace). Watch for mid-take restarts (Whisper may hide a 3 s
   false start: AD1LA_B had one → split into two pieces). `pieces.json` → `pieces.py` (face-tracked crops V/S/H) →
   `piece_words.py` (mlx-whisper) → `matte_rvm.sh` (RVM person matte, ~1 min per piece×format) → `ads.json` + `ads.py`.
2. **Modules** (`batch/modules.js`): one function per piece, written in piece-local time; `t('word', after)` looks
   words up (a capitalised word only matches a sentence-start word). The engine shifts everything by the piece's t0
   (`E.setOff`); initial hide-sets use position `-0` so they are never shifted.
3. **Devices** (`batch/devices.js`): big (word behind the head, placed from the matte's head box `headtrack.py`),
   side, clockBeat, navyList (auto-fit title), paper (stacked text, person pushed under the text), phone (CTA),
   question (AD4 "caja de preguntas" sticker), offerWall (job cards behind the head for "mira estas ofertas").
   `fillPills()` captions every word no device shows.
4. `gen_reel.py AD F` (2 passes: collects Seedance/phone media) → `sheet.py comp/AD_F W H t…` (preview stills; the
   matte doesn't show in previews) → `render_reel.sh AD F out.mp4` (render + `mix_reel.py` = approved SFX palette)
   → `queue.sh` renders all reels × formats sequentially (~3.4 min per 50 s reel).
5. Seedance clips are REUSED across reels (unfold_remote / tear_office, V + 16:9 with square = centre crop).

Traps hit: preview tl must be `E.tlRaw`; lookups like t('De') hit an inner "de" without case matching; ws('que decide',
t('decide')) fails (search start must precede the first word); a side word may hide up to 20% behind the head, not more.
