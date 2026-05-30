/** Hunos E2E app URL — must be absolute for CDP-attached pages (no Playwright baseURL). */
export function resolveE2eAppUrl(): string {
  if (process.env.E2E_BASE_URL) {
    return process.env.E2E_BASE_URL;
  }
  const port = process.env.E2E_PORT ?? "5176";
  return `http://127.0.0.1:${port}/?lang=zh-CN`;
}
