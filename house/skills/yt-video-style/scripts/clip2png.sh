#!/bin/bash
osascript -e "set f to open for access POSIX file \"$(pwd)/gen_hero/$1.png\" with write permission" -e 'write (the clipboard as «class PNGf») to f' -e 'close access f' && sips -g pixelWidth gen_hero/$1.png | tail -1
