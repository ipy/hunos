import { test, expect } from "../fixtures/app";
import { openFindInNote } from "../helpers/interactions";
import {
  editorLocator,
  openCleanFormatPlayground,
} from "../helpers/playground";

test.describe("find in note", () => {
  test.beforeEach(async ({ page }) => {
    await openCleanFormatPlayground(page);
  });

  test("opens find bar with Cmd+F and shows match counter testid", async ({
    page,
  }) => {
    const editor = editorLocator(page);
    await editor.click();
    await openFindInNote(page);

    const findBar = page.getByTestId("editor-find-bar");
    await expect(findBar).toBeVisible();

    const findInput = page.getByTestId("editor-find-input");
    await findInput.fill("一级标题");
    await expect(page.getByTestId("editor-find-match-count")).toContainText(
      "1",
    );
  });

  test("replace-one button is wired in replace mode", async ({ page }) => {
    await openFindInNote(page, { replace: true });
    await expect(page.getByTestId("editor-find-bar")).toBeVisible();
    await expect(page.getByTestId("editor-replace-input")).toBeVisible();
    await expect(page.getByTestId("editor-replace-one")).toBeVisible();
    await expect(page.getByTestId("editor-replace-all")).toBeVisible();
  });
});
