#!/bin/bash
# render every reel × format as soon as its ad assets exist
cd "$(dirname "$0")"
O="${OUT_DIR:?set OUT_DIR to the delivery folder}"; A=../tanda10-reels/work/ads
N(){ case $1 in V) echo "Reel 9x16";; S) echo "Cuadrado 1x1";; H) echo "Horizontal 16x9";; esac; }
JOBS="EU3_A:EU AD3 Hook A|EU3_C:EU AD3 Hook C|AD1EU_A:EU AD1 Hook A|AD1EU_B:EU AD1 Hook B|AD1EU_C:EU AD1 Hook C|AD4EU_A:EU AD4-VA Hook A|AD4EU_B:EU AD4-VA Hook B|AD4EU_C:EU AD4-VA Hook C|AD4LA_A:LATAM AD4-VA Hook A|AD4LA_B:LATAM AD4-VA Hook B|AD4LA_C:LATAM AD4-VA Hook C|AD3LA:LATAM AD3|AD1LA:LATAM AD1"
IFS='|'; for j in $JOBS; do
  ad=${j%%:*}; t=${j#*:}
  until [ -f $A/$ad.wav ] && [ -f $A/$ad.json ]; do sleep 30; done
  for F in V S H; do
    [ -f "$O/$t - $(N $F).mp4" ] && continue
    ./render_reel.sh $ad $F "$O/$t - $(N $F).mp4" 2>&1 | grep -E "DELIVERED|rror|Error" || echo "FAIL $ad $F"
  done
done
echo QUEUEDONE
