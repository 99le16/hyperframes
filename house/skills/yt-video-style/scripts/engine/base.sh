#!/bin/bash
# base.sh <ID> [t_rel ...] — camera/clip base stills for an item WITHOUT overlay → prev/base/<ID>_<t>.jpg (t relative to item start)
cd "$(dirname "$0")"; mkdir -p prev/base
ID=$1; shift
S=$(python3 -c "import json;print([x['s'] for x in json.load(open('plan.json'))['items'] if x['id']=='$ID'][0])")
for t in "$@"; do BASEONLY=1 STILL_OUT=prev/base/${ID}_$t.jpg python3 compose.py --stills $(python3 -c "print(round($S+$t,3))") >/dev/null 2>&1; echo prev/base/${ID}_$t.jpg; done
