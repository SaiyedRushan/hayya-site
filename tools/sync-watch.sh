#!/usr/bin/env bash
#
# Rebuilds watch/ from the watch pictures in the two app repos.
#
# Wear OS: hayya-wear's store/screens and store/faces are 900px round PNGs with
# a transparent corner, drawn by that repo's scripts rather than captured. The
# site shows them at up to ~220 CSS px, so 440px is a 2x asset. The corners stay
# transparent in both the PNG and the WebP so the round dial sits on the page.
#
# Apple Watch: the hayya repo's store/watch holds 374x446 simulator captures,
# already about 2x for the ~190 CSS px they are shown at, so they are copied at
# their own size. That folder lives on build-train until the watch app reaches
# staging, so it is read straight from git when it is not on disk.
#
# Usage: tools/sync-watch.sh [path-to-hayya-repo] [path-to-hayya-wear-repo]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_REPO="${1:-$ROOT/../hayya}"
WEAR_REPO="${2:-$ROOT/../hayya-wear}"
WATCH_BRANCH="${WATCH_BRANCH:-origin/build-train}"

command -v cwebp >/dev/null || { echo "cwebp not found (brew install webp)" >&2; exit 1; }
[ -d "$WEAR_REPO/store" ] || { echo "no hayya-wear store art at $WEAR_REPO/store" >&2; exit 1; }

OUT="$ROOT/watch"
mkdir -p "$OUT"

report() {
  printf '  %-26s %5s KB png  %5s KB webp\n' "$1" \
    "$(( $(stat -f%z "$OUT/$1.png") / 1024 ))" \
    "$(( $(stat -f%z "$OUT/$1.webp") / 1024 ))"
}

# source path (under hayya-wear/store) -> site name, in page order.
WEAR="
screens/app-today:wear-app-today
screens/tile:wear-tile
screens/call:wear-call
faces/classic-cream:face-classic-cream
faces/digital-navy:face-digital-navy
faces/arabic-green:face-arabic-green
faces/analog-burgundy:face-analog-burgundy
faces/star-teal:face-star-teal
"

echo "wear os      <- $WEAR_REPO/store"
for pair in $WEAR; do
  src="${pair%%:*}"; dst="${pair##*:}"
  sips --resampleWidth 440 "$WEAR_REPO/store/$src.png" --out "$OUT/$dst.png" >/dev/null
  # -exact keeps the transparent corners' colour data as it is, so no dark
  # fringe shows round the dial on the cream page.
  cwebp -quiet -q 84 -exact "$OUT/$dst.png" -o "$OUT/$dst.webp"
  report "$dst"
done

# Two of the six captures are left out: watch-face-inline shows grey
# placeholder icons for other apps, and watch-stack-widget is the same view as
# watch-stack-rectangular a second earlier.
APPLE="
watch-app-today:apple-app-today
watch-face-contour-circular:apple-face-circular
watch-face-corner-and-inline:apple-face-corner
watch-stack-rectangular:apple-smart-stack
"

if [ -d "$APP_REPO/store/watch" ]; then
  echo "apple watch  <- $APP_REPO/store/watch"
  fetch() { cp "$APP_REPO/store/watch/$1.png" "$2"; }
else
  echo "apple watch  <- $WATCH_BRANCH:store/watch (git)"
  fetch() { git -C "$APP_REPO" show "$WATCH_BRANCH:store/watch/$1.png" > "$2"; }
fi

for pair in $APPLE; do
  src="${pair%%:*}"; dst="${pair##*:}"
  fetch "$src" "$OUT/$dst.png"
  cwebp -quiet -q 84 "$OUT/$dst.png" -o "$OUT/$dst.webp"
  report "$dst"
done

# Every Wear OS face style in every colour, for the face picker on the home
# page. WebP only: the picker is script-driven, and every browser that runs it
# reads WebP. Loaded one at a time, when someone picks that combination.
FACES_OUT="$OUT/faces"
mkdir -p "$FACES_OUT"
count=0
for src in "$WEAR_REPO"/store/faces/*.png; do
  name="$(basename "$src" .png)"
  tmp="$FACES_OUT/$name.png"
  sips --resampleWidth 440 "$src" --out "$tmp" >/dev/null
  cwebp -quiet -q 84 -exact "$tmp" -o "$FACES_OUT/$name.webp"
  rm "$tmp"
  count=$((count + 1))
done
echo "faces        <- $WEAR_REPO/store/faces ($count, $(( $(cat "$FACES_OUT"/*.webp | wc -c) / 1024 )) KB)"
