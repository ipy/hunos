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
# E2E HAP exposes window.__hunosE2e for Playwright (mobile layout has no Cmd+F/N).
export HUNOS_E2E="${HUNOS_E2E:-1}"
npx vite build --config vite.config.harmony.ts

echo "=== Packaging web assets for rawfile ==="
bash "$SCRIPT_DIR/scripts/package-rawfile.sh"

echo "=== Building HarmonyOS HAP ==="
cd "$SCRIPT_DIR"
hvigorw assembleHap --no-daemon

echo "=== Build complete ==="
echo "Output: entry/build/default/outputs/default/entry-default-unsigned.hap"
