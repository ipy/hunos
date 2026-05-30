import { E2E_CDP_PORT } from "./helpers/e2e-cdp";
import { isHarmonyRuntime, isWebRuntime, loadE2eRuntime } from "./helpers/e2e-runtime";

/**
 * Verify CDP for the runtime chosen by e2e/resolve-runtime.mjs (no bundled Chromium).
 */
export default async function globalSetup(): Promise<void> {
  const runtime = loadE2eRuntime();
  const res = await fetch(`${runtime.cdpUrl}/json/version`).catch(() => null);
  if (!res?.ok) {
    const hint = isWebRuntime()
      ? `Start Chrome: npm run chrome:e2e (port ${E2E_CDP_PORT}, not :9222).`
      : "Start emulator, install debug HAP, run: npm run harmony:e2e:forward";
    throw new Error(
      `CDP not reachable at ${runtime.cdpUrl} (mode=${runtime.mode}). ${hint} ` +
        `Do not run "playwright install chromium".`,
    );
  }

  if (isHarmonyRuntime()) {
    const listRes = await fetch(`${runtime.cdpUrl}/json/list`).catch(() => null);
    const pages = listRes?.ok ? ((await listRes.json()) as { url?: string }[]) : [];
    const page = pages.find((p) => p.url && p.url !== "about:blank");
    if (!page) {
      throw new Error(
        "Harmony CDP has no Hunos page. Open the app on the emulator — tests attach to ArkWeb on device, not Vite.",
      );
    }
    console.log(`[e2e] Harmony page on device: ${page.url ?? "(no url)"}`);
    return;
  }

  const version = (await res.json()) as { Browser?: string };
  console.log(`[e2e] Web Chrome: ${version.Browser ?? "unknown"}`);
}
