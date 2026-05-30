#!/bin/bash
# Build script for Hunos HarmonyOS project
# Prerequisites: DevEco Studio installed at /Applications/DevEco-Studio.app

set -e

DEVECO_HOME="/Applications/DevEco-Studio.app/Contents"
export DEVECO_SDK_HOME="$DEVECO_HOME/sdk"
export JAVA_HOME="$DEVECO_HOME/jbr/Contents/Home"
export NODE_HOME="$DEVECO_HOME/tools/node"
export PATH="$DEVECO_HOME/tools/ohpm/bin:$DEVECO_HOME/tools/hvigor/bin:$DEVECO_HOME/tools/node/bin:$JAVA_HOME/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# macOS sed requires -i ''; GNU sed uses -i alone.
sed_inplace() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

echo "=== Building web assets (IIFE for HarmonyOS) ==="
cd "$PROJECT_ROOT"
# E2E HAP exposes window.__hunosE2e for Playwright (mobile layout has no Cmd+F/N).
export HUNOS_E2E="${HUNOS_E2E:-1}"
npx vite build --config vite.config.harmony.ts

echo "=== Packaging web assets for rawfile ==="
RAWFILE_DIR="$SCRIPT_DIR/entry/src/main/resources/rawfile"
DIST_DIR="$PROJECT_ROOT/dist-harmony"
JS_FILE="$DIST_DIR/app.js"
ASSETS_DIR="$DIST_DIR/assets"

if [ ! -f "$JS_FILE" ]; then
  echo "ERROR: app.js not found in dist-harmony/"
  exit 1
fi

if [ ! -d "$ASSETS_DIR" ]; then
  echo "ERROR: assets directory not found in dist-harmony/"
  exit 1
fi

rm -rf "$RAWFILE_DIR"/*
mkdir -p "$RAWFILE_DIR/assets"

CSS_FILE="$(find "$ASSETS_DIR" -maxdepth 1 -name 'style-*.css' -print -quit)"
if [ -z "$CSS_FILE" ]; then
  echo "ERROR: style-*.css not found in dist-harmony/assets/"
  exit 1
fi

CSS_BASENAME="$(basename "$CSS_FILE")"

# Copy font and other static assets; rewrite absolute /assets/ URLs to same-dir relative paths.
cp -R "$ASSETS_DIR"/. "$RAWFILE_DIR/assets/"
sed_inplace 's|url(/assets/|url(|g' "$RAWFILE_DIR/assets/$CSS_BASENAME"

ASSET_COUNT="$(find "$RAWFILE_DIR/assets" -type f | wc -l | tr -d ' ')"
echo "Copied $ASSET_COUNT asset files (including $CSS_BASENAME)"

# JS stays inlined (ArkWeb rawfile cannot load external scripts reliably).
{
cat << HTMLEOF
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<title>Hunos</title>
<link rel="stylesheet" href="assets/$CSS_BASENAME"/>
<style>
*{box-sizing:border-box}
html,body,#root{margin:0;padding:0;height:100%;width:100%;overflow:hidden;font-family:"HarmonyOS Sans SC","HarmonyOS Sans",sans-serif;-webkit-font-smoothing:antialiased;position:fixed;inset:0}
::-webkit-scrollbar{width:0;height:0}
::selection{background:rgba(232,93,74,0.2)}
</style>
</head>
<body>
<div id="root"></div>
<script>
HTMLEOF
cat "$JS_FILE"
printf '\n</script>\n</body>\n</html>\n'
} > "$RAWFILE_DIR/index.html"

HTML_BYTES="$(wc -c < "$RAWFILE_DIR/index.html" | tr -d ' ')"
RAWFILE_BYTES="$(du -sk "$RAWFILE_DIR" | awk '{print $1}')"
echo "=== rawfile ready: index.html ${HTML_BYTES} bytes, total ${RAWFILE_BYTES} KB ==="

echo "=== Building HarmonyOS HAP ==="
cd "$SCRIPT_DIR"
hvigorw assembleHap --no-daemon

echo "=== Build complete ==="
echo "Output: entry/build/default/outputs/default/entry-default-unsigned.hap"
