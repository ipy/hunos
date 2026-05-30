import { test, expect } from "../fixtures/app";
import { isHarmonyRuntime } from "../helpers/e2e-runtime";
import { editorLocator } from "../helpers/playground";

test.describe("mobile FAB create", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("FAB opens new note with title focused", async ({ page }) => {
    await expect(page.getByTestId("create-note-fab")).toBeVisible();
    await page.getByTestId("create-note-fab").click();
    const titleInput = page.getByTestId("note-title");
    if (isHarmonyRuntime()) {
      await titleInput.click();
    } else {
      await expect(titleInput).toBeFocused({ timeout: 15_000 });
    }
    await titleInput.fill("E2E Mobile");
    await editorLocator(page).click();
    await page.keyboard.type("Mobile body");
    await expect(editorLocator(page)).toContainText("Mobile body");
  });
});
