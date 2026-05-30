import { test, expect } from "../fixtures/app";
import { isHarmonyRuntime, isWebRuntime, loadE2eRuntime } from "../helpers/e2e-runtime";

test.describe("e2e runtime", () => {
  test("reports active runtime (harmony emulator vs web chrome)", async ({ page }) => {
    const runtime = loadE2eRuntime();
    if (isHarmonyRuntime()) {
      const ua = await page.evaluate(() => navigator.userAgent);
      expect(ua).toContain("ArkWeb");
      return;
    }
    expect(isWebRuntime()).toBe(true);
    await expect(page.getByTestId("note-list")).toBeVisible();
  });
});
