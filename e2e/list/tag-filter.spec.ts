import { test, expect } from "../fixtures/app";
import {
  clearTagFilter,
  editorLocator,
  openCleanFormatPlayground,
} from "../helpers/playground";

test.describe("note list tag filter", () => {
  test.beforeEach(async ({ page }) => {
    await openCleanFormatPlayground(page);
  });

  test("clicking #格式测试 filters list and clears via 全部笔记", async ({
    page,
  }) => {
    const tag = editorLocator(page).locator(
      '.editor-tag[data-tag-name="格式测试"]',
    );
    await expect(tag.first()).toBeVisible({ timeout: 15_000 });
    await tag.first().scrollIntoViewIfNeeded();
    await tag.first().click();

    const filterHeader = page.getByTestId("note-list-tag-filter");
    await expect(filterHeader).toBeVisible();
    await expect(filterHeader).toHaveAttribute("data-tag-name", "格式测试");

    await clearTagFilter(page);
    await expect(page.getByTestId("note-list-item")).toHaveCount(
      await page.getByTestId("note-list-item").count(),
    );
  });
});
