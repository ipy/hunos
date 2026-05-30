/**
 * Hunos Playwright E2E Chrome CDP port.
 * Do not use :9222 — agent-browser / DevLoop and other tools often bind there.
 */
export const E2E_CDP_PORT = 9224;

export function resolveE2eCdpUrl(): string {
  return process.env.PW_CDP_URL ?? `http://127.0.0.1:${E2E_CDP_PORT}`;
}
