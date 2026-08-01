#!/usr/bin/env bash
#
# Rebuilds screenshots/ from the App Store screenshots in the app repo.
#
# The store masters are 1284x2778; the site shows them at ~232 CSS px wide, so
# 600px wide is a comfortable 2x asset. Both a WebP (what browsers actually
# load) and a PNG fallback are written, and the pairs are referenced from a
# <picture> in index.html.
#
# Usage: tools/sync-screenshots.sh [path-to-hayya-repo]
set -euo pipefail

APP_REPO="${1:-$(cd "$(dirname "$0")/../../hayya" && pwd)}"
SRC="$APP_REPO/store/screenshots-ios-1284x2778"
OUT="$(cd "$(dirname "$0")/.." && pwd)/screenshots"

[ -d "$SRC" ] || { echo "no screenshots at $SRC" >&2; exit 1; }
command -v cwebp >/dev/null || { echo "cwebp not found (brew install webp)" >&2; exit 1; }

mkdir -p "$OUT"

# source name -> site name (the six that tell the story, in order)
SHOTS="
02-streak:01-home
01-alarm-call:02-call
03-meeting-alarm:03-meeting
07-themes:04-themes
10-decline:05-decline
09-history:06-history
"

for pair in $SHOTS; do
  src="${pair%%:*}"
  dst="${pair##*:}"
  # --resampleWidth, not -Z: -Z fits the *longest* side, which would leave these
  # portrait shots only ~296px wide.
  sips --resampleWidth 600 "$SRC/$src.png" --out "$OUT/$dst.png" >/dev/null
  cwebp -quiet -q 82 "$OUT/$dst.png" -o "$OUT/$dst.webp"
  printf '%-14s %6s KB png  %6s KB webp\n' "$dst" \
    "$(( $(stat -f%z "$OUT/$dst.png") / 1024 ))" \
    "$(( $(stat -f%z "$OUT/$dst.webp") / 1024 ))"
done
