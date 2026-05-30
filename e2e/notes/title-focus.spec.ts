import { test, expect } from "../fixtures/app";
import { openNoteFromList } from "../helpers/notes";
import { editorLocator } from "../helpers/playground";

test.describe("title focus on note switch", () => {
  test("opening existing notes does not refocus title", async ({ page }) => {
    await openNoteFromList(page, "格式试炼场");
    await expect(page.getByTestId("note-title")).not.toBeFocused();

    await openNoteFromList(page, "欢迎使用 Hunos");
    await expect(page.getByTestId("note-title")).not.toBeFocused();

    await editorLocator(page).click();
    await expect(page.locator(".ProseMirror-focused")).toBeVisible();
  });
});
