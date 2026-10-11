#!/bin/bash
# retime.sh NAME [SKIP] [SPEED] -> seed/NAME_fast.mp4 (25 fps, -g 5) + seed/NAME_last.png ; NAME may end in _h (S = centre crop of _h)
cd "$(dirname "$0")"; N=$1; SK=${2:-0.5}; SP=${3:-1.7}
ffmpeg -v error -y -ss $SK -i seed/$N.mp4 -vf "setpts=PTS/$SP,fps=25" -an -c:v libx264 -crf 14 -g 5 -pix_fmt yuv420p seed/${N}_fast.mp4
ffmpeg -v error -y -sseof -0.05 -i seed/${N}_fast.mp4 -frames:v 1 -update 1 seed/${N}_last.png
if [[ $N == *_h ]]; then B=${N%_h}
  ffmpeg -v error -y -i seed/${N}_fast.mp4 -vf "crop=ih:ih,scale=1080:1080:flags=lanczos" -an -c:v libx264 -crf 14 -g 5 -pix_fmt yuv420p seed/${B}_s_fast.mp4
  ffmpeg -v error -y -sseof -0.05 -i seed/${B}_s_fast.mp4 -frames:v 1 -update 1 seed/${B}_s_last.png
fi
ffprobe -v error -show_entries format=duration -of csv=p=0 seed/${N}_fast.mp4
