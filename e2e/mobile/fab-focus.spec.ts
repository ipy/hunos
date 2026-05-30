import { test, expect } from "../fixtures/app";
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
    await expect(page.getByTestId("note-title")).toBeFocused();
    await page.getByTestId("note-title").fill("E2E Mobile");
    await editorLocator(page).click();
    await page.keyboard.type("Mobile body");
    await expect(editorLocator(page)).toContainText("Mobile body");
  });
});
