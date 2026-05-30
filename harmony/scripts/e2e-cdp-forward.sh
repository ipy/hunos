#!/usr/bin/env bash
# HarmonyOS ArkWeb → localhost CDP port forward (example for E2E / chrome://inspect).
#
# Web Playwright E2E Chrome uses :9224; agent-browser often uses :9222. Harmony default :9223.
#
# Prereqs:
#   - DevEco / OpenHarmony SDK hdc on PATH
#   - Emulator or device connected (`hdc list targets`)
#   - Debug HAP with WebviewController.setWebDebuggingAccess(true) in Index.ets
#   - Hunos app running on device (open once manually or via `hdc shell aa start`)
#
# Usage:
#   ./harmony/scripts/e2e-cdp-forward.sh
#   HARMONY_CDP_LOCAL_PORT=9223 ./harmony/scripts/e2e-cdp-forward.sh
#
# Then (optional Playwright, separate from web 9224):
#   HARMONY_CDP_URL=http://127.0.0.1:9223 PW_CONNECT_HARMONY_CDP=1 \
#     npx playwright test e2e/examples/harmony-cdp.smoke.spec.ts

set -euo pipefail

LOCAL_PORT="${HARMONY_CDP_LOCAL_PORT:-9223}"
BUNDLE_ID="${HARMONY_BUNDLE_ID:-com.hunos.notes}"

if ! command -v hdc >/dev/null 2>&1; then
  echo "hdc not found. Add DevEco Studio SDK toolchains to PATH." >&2
  echo "  e.g. export PATH=\"/Applications/DevEco-Studio.app/Contents/sdk/default/openharmony/toolchains:\$PATH\"" >&2
  exit 1
fi

echo "=== hdc targets ==="
hdc list targets

echo "=== find Hunos process (bundle: ${BUNDLE_ID}) ==="
PID="$(hdc shell pidof "${BUNDLE_ID}" 2>/dev/null | tr -d '\r' | awk '{print $1}')"
if [[ -z "${PID}" ]]; then
  echo "Hunos not running — starting EntryAbility on device..."
  hdc shell aa start -a EntryAbility -b "${BUNDLE_ID}" 2>/dev/null || true
  sleep 2
  PID="$(hdc shell pidof "${BUNDLE_ID}" 2>/dev/null | tr -d '\r' | awk '{print $1}')"
fi
if [[ -z "${PID}" ]]; then
  echo "Process not found. Open Hunos on the emulator or install the debug HAP." >&2
  exit 1
fi
echo "pid=${PID}"

echo "=== find ArkWeb devtools socket ==="
SOCKET_LINE="$(hdc shell "cat /proc/net/unix | grep webview_devtools_remote_${PID}" 2>/dev/null | head -1 | tr -d '\r')"
if [[ -z "${SOCKET_LINE}" ]]; then
  echo "No webview_devtools_remote_${PID} socket. Is setWebDebuggingAccess(true) enabled?" >&2
  hdc shell "cat /proc/net/unix | grep devtools" 2>/dev/null | head -5 || true
  exit 1
fi
echo "${SOCKET_LINE}"

REMOTE="webview_devtools_remote_${PID}"
echo "=== clear stale forwards on tcp:${LOCAL_PORT} ==="
while IFS= read -r line; do
  [[ -z "${line}" || "${line}" == *"[Empty]"* ]] && continue
  remote="$(echo "${line}" | awk '{print $3}')"
  if [[ -n "${remote}" ]]; then
    hdc fport rm "tcp:${LOCAL_PORT}" "${remote}" 2>/dev/null || true
  fi
done < <(hdc fport ls 2>/dev/null | grep "tcp:${LOCAL_PORT}" || true)

echo "=== forward tcp:${LOCAL_PORT} → localabstract:${REMOTE} ==="
hdc fport "tcp:${LOCAL_PORT}" "localabstract:${REMOTE}"
hdc fport ls

echo ""
echo "Open Chrome → chrome://inspect/#devices (or connect Playwright to http://127.0.0.1:${LOCAL_PORT})"
echo "Harmony E2E: npm run test:e2e:harmony   (or npm run test:e2e for auto-detect)"
