#!/usr/bin/env bash
#
# Rebuilds data/duas.json from the app's dua library (see export-duas.ts).
# Run it whenever a duʿā is added to the app or a word of one is corrected.
#
# Usage: tools/sync-duas.sh [path-to-hayya-repo]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_REPO="$(cd "${1:-$ROOT/../hayya}" && pwd)"

[ -f "$APP_REPO/src/lib/duaLibrary.ts" ] || { echo "no dua library at $APP_REPO/src/lib" >&2; exit 1; }

# The app repo's own node_modules resolve the library's imports.
cd "$APP_REPO"
npx --yes tsx "$ROOT/tools/export-duas.ts" "$APP_REPO"
