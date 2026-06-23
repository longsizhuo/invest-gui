#!/usr/bin/env bash
# design-sync pre-build setup for invest-gui.
#
# invest-gui IS the package (repo root), not an installed dependency, so two
# things the converter assumes don't exist out of the box:
#
#  1. node_modules/<pkg>: the converter resolves PKG_DIR = node_modules/invest-gui.
#     We point it at an ISOLATED package root (.ds-sync/pkgroot) that symlinks
#     package.json / src / tsconfig / .design-sync but has NO nested node_modules
#     — a whole-repo symlink makes ts-morph's descendant walk loop forever
#     (node_modules/invest-gui/node_modules/invest-gui/…).
#
#  2. A compiled stylesheet: components are styled with Tailwind utilities +
#     var(--*) tokens; the esbuild bundle is JS-only. We compile Tailwind (it
#     reads the project's own tailwind.config.js, content: ./src/**) and prepend
#     the app's Google Fonts @import so previews render in the real brand fonts.
#     cfg.cssEntry must stay inside PKG_DIR's realpath, so we emit it as a REAL
#     file in .ds-sync/pkgroot (not under the .design-sync symlink, which escapes).
#
# Wired as cfg.buildCmd so re-syncs reproduce all of this before the converter.
set -euo pipefail
cd "$(dirname "$0")/.."   # -> invest-gui root
ROOT="$(pwd)"

# 1. isolated package root
mkdir -p .ds-sync/pkgroot
ln -sfn ../../package.json   .ds-sync/pkgroot/package.json
ln -sfn ../../src            .ds-sync/pkgroot/src
ln -sfn ../../tsconfig.json  .ds-sync/pkgroot/tsconfig.json
ln -sfn ../../.design-sync   .ds-sync/pkgroot/.design-sync
ln -sfn "$ROOT/.ds-sync/pkgroot" node_modules/invest-gui

# 2. compiled stylesheet (real file inside pkgroot so cfg.cssEntry stays bounded)
FONTS='@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap");'
npx --yes tailwindcss -i src/index.css -o .ds-sync/.tw.css --minify
{ printf '%s\n' "$FONTS"; cat .ds-sync/.tw.css; } > .ds-sync/pkgroot/ds-tailwind.css
rm -f .ds-sync/.tw.css
echo "wrote .ds-sync/pkgroot/ds-tailwind.css ($(wc -c < .ds-sync/pkgroot/ds-tailwind.css) bytes)"
