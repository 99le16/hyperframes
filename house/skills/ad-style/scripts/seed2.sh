#!/bin/bash
# seed2.sh NAME START END ASPECT "PROMPT"  -> seed/NAME.mp4 (Seedance 1.5, start+end frame)
cd "$(dirname "$0")"
N=$1; S=$2; E=$3; A=$4; P=$5
higgsfield generate create seedance1_5 --prompt "$P" --start-image "$S" --end-image "$E" \
  --duration 4 --resolution 1080p --aspect_ratio $A --generate_audio false --wait --wait-timeout 15m --json > seed/$N.json
U=$(grep -o '"result_url": "[^"]*' seed/$N.json | head -1 | cut -d'"' -f4)
[ -n "$U" ] && curl -s -o seed/$N.mp4 "$U" && echo "OK $N" || { echo "FAIL $N"; cat seed/$N.json | tail -5; }
