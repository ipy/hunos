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

echo "=== Building web assets (IIFE for HarmonyOS) ==="
cd "$PROJECT_ROOT"
npx vite build --config vite.config.harmony.ts

echo "=== Creating single-file HTML for rawfile ==="
RAWFILE_DIR="$SCRIPT_DIR/entry/src/main/resources/rawfile"
rm -rf "$RAWFILE_DIR"/*

JS_FILE="$PROJECT_ROOT/dist-harmony/app.js"
if [ ! -f "$JS_FILE" ]; then
  echo "ERROR: app.js not found in dist-harmony/"
  exit 1
fi

# Build a single HTML file with inlined JS (no external script imports)
{
cat << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<title>Hunos</title>
<style>
*{box-sizing:border-box}
html,body,#root{margin:0;padding:0;height:100%;width:100%;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased;position:fixed;inset:0}
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

echo "=== Inlined HTML created ($(wc -c < "$RAWFILE_DIR/index.html" | tr -d ' ') bytes) ==="

echo "=== Building HarmonyOS HAP ==="
cd "$SCRIPT_DIR"
hvigorw assembleHap --no-daemon

echo "=== Build complete ==="
echo "Output: entry/build/default/outputs/default/entry-default-unsigned.hap"
