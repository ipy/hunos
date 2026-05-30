import { expect, type Page } from "@playwright/test";
import { isHarmonyRuntime } from "./e2e-runtime";

/** True on Harmony WebView or when the app is in mobile/tablet layout (<1024px). */
export async function isMobileAppLayout(page: Page): Promise<boolean> {
  if (isHarmonyRuntime()) return true;
  return page.evaluate(() => window.innerWidth < 1024);
}

async function viaE2eBridge(
  page: Page,
  fn: "createNote" | "requestFindInNote",
  arg?: boolean,
): Promise<boolean> {
  return page.evaluate(
    async ({ name, replace }) => {
      const bridge = (
        window as Window & {
          __hunosE2e?: {
            createNote: () => Promise<unknown>;
            requestFindInNote: (replace?: boolean) => void;
          };
        }
      ).__hunosE2e;
      if (!bridge) return false;
      if (name === "createNote") {
        await bridge.createNote();
        return true;
      }
      bridge.requestFindInNote(replace);
      return true;
    },
    { name: fn, replace: arg },
  );
}

export async function openFindInNote(
  page: Page,
  options?: { replace?: boolean },
): Promise<void> {
  const bridged = await viaE2eBridge(
    page,
    "requestFindInNote",
    options?.replace ?? false,
  );
  if (bridged) {
    await expect(page.getByTestId("editor-find-bar")).toBeVisible({
      timeout: 15_000,
    });
    return;
  }
  if (await isMobileAppLayout(page)) {
    throw new Error(
      "openFindInNote: mobile layout has no Cmd+F — build HAP with HUNOS_E2E=1 for __hunosE2e bridge",
    );
  }
  await page.keyboard.press(options?.replace ? "Meta+Alt+f" : "Meta+f");
  await expect(page.getByTestId("editor-find-bar")).toBeVisible();
}
