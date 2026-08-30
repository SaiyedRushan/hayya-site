#!/usr/bin/env bash
#
# Rebuilds screenshots/ and collages/ from the store art in the app repo.
#
# Phone shots: the store masters are 1284x2778 and the site shows them at
# ~232 CSS px wide, so 600px wide is a comfortable 2x asset.
# Collages: 2400px masters shown at up to 1032 CSS px, so 1600px is a fair
# compromise between sharpness and page weight.
#
# Both a WebP (what browsers actually load) and a fallback are written — PNG for
# the phone shots, JPEG for the collages, whose big soft gradients cost far more
# as PNG than the artefacts cost as JPEG. Each pair is referenced from a
# <picture> in index.html.
#
# Usage: tools/sync-screenshots.sh [path-to-hayya-repo-or-worktree]
set -euo pipefail

APP_REPO="${1:-$(cd "$(dirname "$0")/../../hayya" && pwd)}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# The 2026 revamp moved the masters under store/revamp/; fall back to the
# original 1.0 folder so an older checkout still works.
SRC="$APP_REPO/store/revamp/ios-1284x2778-raw"
[ -d "$SRC" ] || SRC="$APP_REPO/store/screenshots-ios-1284x2778"
COLLAGE_SRC="$APP_REPO/store/revamp/collages"

[ -d "$SRC" ] || { echo "no screenshots at $SRC" >&2; exit 1; }
command -v cwebp >/dev/null || { echo "cwebp not found (brew install webp)" >&2; exit 1; }

mkdir -p "$ROOT/screenshots" "$ROOT/collages"

# source name -> site name, in the order the carousel shows them.
SHOTS="
01-home:01-home
03-call-phone:02-call
12-themes:03-themes
10-dua-gate:04-dua-gate
50-widgets-home:05-widgets
51-widgets-lock:06-lock
13-alarms:07-alarms
17-adhkar:08-adhkar
21-qibla:09-qibla
08-decline:10-decline
"

echo "phone shots  <- $SRC"
for pair in $SHOTS; do
  src="${pair%%:*}"; dst="${pair##*:}"
  # --resampleWidth, not -Z: -Z fits the *longest* side, which would leave these
  # portrait shots only ~296px wide.
  sips --resampleWidth 600 "$SRC/$src.png" --out "$ROOT/screenshots/$dst.png" >/dev/null
  cwebp -quiet -q 82 "$ROOT/screenshots/$dst.png" -o "$ROOT/screenshots/$dst.webp"
  printf '  %-12s %5s KB png  %5s KB webp\n' "$dst" \
    "$(( $(stat -f%z "$ROOT/screenshots/$dst.png") / 1024 ))" \
    "$(( $(stat -f%z "$ROOT/screenshots/$dst.webp") / 1024 ))"
done

[ -d "$COLLAGE_SRC" ] || { echo "no collages at $COLLAGE_SRC — skipping"; exit 0; }

# Only the collages the page actually references; the rest stay in the app repo.
COLLAGES="01-call-styles 02-dua-gate 03-adhkar 04-your-alarms 06-times-and-qibla 09-widgets"

echo "collages     <- $COLLAGE_SRC"
for name in $COLLAGES; do
  tmp="$ROOT/collages/$name.tmp.png"
  sips --resampleWidth 1600 "$COLLAGE_SRC/$name.png" --out "$tmp" >/dev/null
  cwebp -quiet -q 80 "$tmp" -o "$ROOT/collages/$name.webp"
  sips -s format jpeg -s formatOptions 82 "$tmp" --out "$ROOT/collages/$name.jpg" >/dev/null
  rm -f "$tmp"
  printf '  %-20s %5s KB jpg  %5s KB webp\n' "$name" \
    "$(( $(stat -f%z "$ROOT/collages/$name.jpg") / 1024 ))" \
    "$(( $(stat -f%z "$ROOT/collages/$name.webp") / 1024 ))"
done
