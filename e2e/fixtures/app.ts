import { test as base, expect, chromium } from "@playwright/test";
import { gotoFreshApp } from "../helpers/playground";
import { isHarmonyRuntime, loadE2eRuntime } from "../helpers/e2e-runtime";

/**
 * CDP fixture — runtime from e2e/resolve-runtime.mjs:
 * - harmony: attach to ArkWeb on emulator (hdc fport :9223), reuse WebView page
 * - web: new tab on Chrome :9224 + Vite :5176
 */
export const test = base.extend({
  browser: [
    async ({}, use) => {
      const { cdpUrl } = loadE2eRuntime();
      const browser = await chromium.connectOverCDP(cdpUrl, {
        noDefaults: true,
      });
      await use(browser);
    },
    { scope: "worker" },
  ],
  context: async ({ browser }, use) => {
    const context = browser.contexts()[0] ?? (await browser.newContext());
    await use(context);
  },
  page: async ({ context }, use) => {
    const runtime = loadE2eRuntime();

    if (isHarmonyRuntime()) {
      const page = context.pages()[0];
      if (!page) {
        throw new Error(
          "Harmony E2E: no WebView page in CDP context. Open Hunos on the emulator first.",
        );
      }
      const ua = await page.evaluate(() => navigator.userAgent);
      if (!ua.includes("ArkWeb")) {
        throw new Error(
          `Harmony E2E: expected ArkWeb user agent, got: ${ua.slice(0, 80)}`,
        );
      }
      await gotoFreshApp(page);
      await use(page);
      return;
    }

    const page = await context.newPage();
    await gotoFreshApp(page);
    await use(page);
    await page.close();
  },
});

export { expect };
