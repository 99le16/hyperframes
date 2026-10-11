#!/bin/bash
# saveclip.sh <out.png> — write the clipboard PNG to disk
out="$1"
osascript -e "set f to open for access POSIX file \"$out\" with write permission" -e "set eof f to 0" -e "write (the clipboard as «class PNGf») to f" -e "close access f" && python3 -c "from PIL import Image;im=Image.open('$out');print(im.size,im.mode)"
