#!/usr/bin/env bash
# Regenerate web images + commit + push (GitHub Pages redeploys automatically).
set -euo pipefail

cd "$(dirname "$0")"

if [ -d masters ]; then
  python3 scripts/build_gallery.py
fi

git add -A
if git diff --cached --quiet; then
  echo "Nema promjena."
  exit 0
fi

git commit -m "${1:-Update astro gallery}"
git push
echo "Objavljeno. GitHub Pages objavi za ~1 minutu."
