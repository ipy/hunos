#!/usr/bin/env bash
# Start Chrome for Playwright E2E (CDP :9224, profile inside repo).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${E2E_CDP_PORT:-9224}"
PROFILE="${E2E_CHROME_PROFILE_DIR:-${ROOT}/.chrome-e2e-profile}"

mkdir -p "${PROFILE}"

if curl -sf "http://127.0.0.1:${PORT}/json/version" >/dev/null 2>&1; then
  echo "Chrome CDP already listening on :${PORT} (profile: ${PROFILE})"
  exit 0
fi

CHROME="${E2E_CHROME_BIN:-}"
if [[ -z "${CHROME}" ]]; then
  for candidate in \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "/Applications/Chromium.app/Contents/MacOS/Chromium" \
    "google-chrome" \
    "chromium"; do
    if [[ -x "${candidate}" ]] || command -v "${candidate}" >/dev/null 2>&1; then
      CHROME="${candidate}"
      break
    fi
  done
fi

if [[ -z "${CHROME}" ]]; then
  echo "Chrome not found. Set E2E_CHROME_BIN to your browser binary." >&2
  exit 1
fi

echo "Starting Chrome CDP :${PORT}"
echo "  profile: ${PROFILE}"
exec "${CHROME}" \
  --remote-debugging-port="${PORT}" \
  --user-data-dir="${PROFILE}" \
  --no-first-run \
  --no-default-browser-check \
  "$@"
