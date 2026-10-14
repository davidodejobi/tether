#!/bin/sh
# Production-preview QA captures and one contact sheet per width and scheme (needs ImageMagick montage).
# Usage: SCREENS_PORT=4272 QA_OUT=<dir outside the repo> tools/qa-capture.sh
set -e
export QA_OUT="${QA_OUT:-/tmp/tether-qa}"
rm -rf "$QA_OUT"
npx playwright test -c playwright.qa.config.ts
for dir in "$QA_OUT"/*/*/; do
  w=$(basename "$(dirname "$dir")"); s=$(basename "$dir")
  montage "$dir"*.png -label '%t' -tile 7x -geometry '480x640>+8+8' -background '#888' "$QA_OUT/sheet-$w-$s.png"
done
ls "$QA_OUT"/sheet-*.png
