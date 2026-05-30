#!/usr/bin/env bash
# Build Hunos Harmony HAP (web + ArkTS) and install on connected emulator/device.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HARMONY_DIR="${ROOT}/harmony"
HAP="${HARMONY_DIR}/entry/build/default/outputs/default/entry-default-unsigned.hap"
BUNDLE_ID="${HARMONY_BUNDLE_ID:-com.hunos.notes}"
DEVECO_HOME="${DEVECO_HOME:-/Applications/DevEco-Studio.app/Contents}"
HDC="${DEVECO_HOME}/sdk/default/openharmony/toolchains/hdc"

export PATH="${DEVECO_HOME}/sdk/default/openharmony/toolchains:${PATH}"

if [[ ! -x "${HDC}" ]] && ! command -v hdc >/dev/null 2>&1; then
  echo "hdc not found. Install DevEco Studio or set DEVECO_HOME." >&2
  exit 1
fi

echo "=== hdc targets ==="
if ! hdc list targets 2>/dev/null | grep -q .; then
  echo "No emulator/device connected. Start one in DevEco Device Manager." >&2
  exit 1
fi

if [[ "${E2E_HARMONY_SKIP_BUILD:-}" != "1" ]]; then
  echo "=== build HAP (vite harmony + hvigor) ==="
  bash "${HARMONY_DIR}/build.sh"
else
  echo "=== skip build (E2E_HARMONY_SKIP_BUILD=1) ==="
  if [[ ! -f "${HAP}" ]]; then
    echo "HAP missing: ${HAP}" >&2
    exit 1
  fi
fi

echo "=== install HAP ==="
hdc install -r "${HAP}"

echo "=== restart ${BUNDLE_ID} ==="
hdc shell aa force-stop "${BUNDLE_ID}" 2>/dev/null || true
sleep 1
hdc shell aa start -a EntryAbility -b "${BUNDLE_ID}"

PID=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  sleep 1
  PID="$(hdc shell pidof "${BUNDLE_ID}" 2>/dev/null | tr -d '\r' | awk '{print $1}')"
  [[ -n "${PID}" ]] && break
done
if [[ -z "${PID}" ]]; then
  echo "App failed to start after install." >&2
  exit 1
fi
echo "installed ok, pid=${PID}"

# Wait for ArkWeb devtools socket, then forward CDP and verify HTTP probe.
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if hdc shell "cat /proc/net/unix | grep -q webview_devtools_remote_${PID}" 2>/dev/null; then
    echo "ArkWeb devtools socket ready"
    break
  fi
  sleep 1
done

bash "${ROOT}/harmony/scripts/e2e-cdp-forward.sh"

LOCAL_PORT="${HARMONY_CDP_LOCAL_PORT:-9223}"
for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if curl -sf "http://127.0.0.1:${LOCAL_PORT}/json/version" >/dev/null 2>&1; then
    echo "CDP HTTP ready on :${LOCAL_PORT}"
    exit 0
  fi
  sleep 1
done
echo "CDP forward up but http://127.0.0.1:${LOCAL_PORT}/json/version not reachable" >&2
exit 1
