import { test, expect } from "../fixtures/app";
import {
  editorLocator,
  openFormatPlayground,
  restoreFormatPlayground,
} from "../helpers/playground";

test.describe("format playground restore", () => {
  test("clears pollution in-session without reload", async ({ page }) => {
    await openFormatPlayground(page);
    const editor = editorLocator(page);
    await editor.click();
    await page.keyboard.type("RestorePollutionMarker");

    await restoreFormatPlayground(page);

    await expect(editor).not.toContainText("RestorePollutionMarker");
    await expect(editor).toContainText("格式试炼场");
  });

  test("restore stays clean after wait without re-typing", async ({
    page,
  }) => {
    await openFormatPlayground(page);
    const editor = editorLocator(page);
    await editor.click();
    await page.keyboard.type("RestorePollutionMarker");
    await restoreFormatPlayground(page);
    await page.waitForTimeout(900);
    await expect(editor).not.toContainText("RestorePollutionMarker");
  });
});
