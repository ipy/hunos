import { test, expect } from "../fixtures/app";
import {
  appendEditorLine,
  editorLocator,
  openCleanFormatPlayground,
} from "../helpers/playground";

test.describe("editor status bar", () => {
  test.beforeEach(async ({ page }) => {
    await openCleanFormatPlayground(page);
  });

  test("shows live word and character counts while typing", async ({
    page,
  }) => {
    await expect(page.getByTestId("editor-status-bar")).toBeVisible();
    const words = page.getByTestId("editor-status-words");
    const chars = page.getByTestId("editor-status-chars");

    const wordsBefore = await words.textContent();
    const charsBefore = await chars.textContent();

    await appendEditorLine(page, "StatusBarLiveE2E ");

    await expect(words).not.toHaveText(wordsBefore ?? "");
    await expect(chars).not.toHaveText(charsBefore ?? "");
  });
});
