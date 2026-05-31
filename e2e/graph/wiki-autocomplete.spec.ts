import { test, expect } from "../fixtures/app";
import {
  WELCOME_NOTE_TITLE,
  editorLocator,
  openCleanFormatPlayground,
  wikiLinkByTitle,
} from "../helpers/playground";

test.describe("wiki-link autocomplete", () => {
  test.beforeEach(async ({ page }) => {
    await openCleanFormatPlayground(page);
  });

  test("typing [[ shows suggestion menu with welcome target", async ({
    page,
  }) => {
    const editor = editorLocator(page);
    await editor.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("[[欢");

    const menu = page.getByTestId("wiki-link-suggestion-menu");
    await expect(menu).toBeVisible();
    const item = page.getByTestId("wiki-link-suggestion-item-0");
    await expect(item).toContainText(WELCOME_NOTE_TITLE);

    await page.keyboard.press("Enter");
    await expect(wikiLinkByTitle(page, WELCOME_NOTE_TITLE)).toBeVisible();
  });
});
