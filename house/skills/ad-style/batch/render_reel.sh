#!/bin/bash
# render_reel.sh AD F OUTNAME
set -e
cd "$(dirname "$0")"; export HYPERFRAMES_EXTRACT_CACHE_DIR="$PWD/.hfcache"
AD=$1; F=$2; OUT="$3"
python3 gen_reel.py $AD $F
npx hyperframes render comp/${AD}_$F -o renders/${AD}_$F.mp4 -q looks --quiet
python3 mix_reel.py $AD $F renders/${AD}_$F.mp4 "$OUT"
echo "DELIVERED $OUT"
