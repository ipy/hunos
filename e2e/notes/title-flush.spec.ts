import { test, expect } from "../fixtures/app";
import { WELCOME_NOTE_TITLE } from "../helpers/playground";

test.describe("title autosave flush on note switch", () => {
  test("persists renamed title when switching before debounce", async ({
    page,
  }) => {
    const playgroundRow = page
      .getByTestId("note-list-item")
      .filter({ hasText: "格式试炼场" })
      .first();
    const welcomeRow = page
      .getByTestId("note-list-item")
      .filter({ hasText: WELCOME_NOTE_TITLE })
      .first();

    const playgroundId = await playgroundRow.getAttribute("data-note-id");
    const welcomeId = await welcomeRow.getAttribute("data-note-id");
    expect(playgroundId).toBeTruthy();
    expect(welcomeId).toBeTruthy();

    await playgroundRow.click();
    await expect(page.getByTestId("note-editor")).toBeVisible();

    const titleInput = page.getByTestId("note-title");
    await titleInput.fill("TitleFlush111");

    await page.locator(`[data-note-id="${welcomeId}"]`).click();
    await expect(page.getByTestId("note-editor")).toBeVisible();

    await page.locator(`[data-note-id="${playgroundId}"]`).click();
    await expect(titleInput).toHaveValue("TitleFlush111");

    await expect(welcomeRow).not.toContainText("TitleFlush111");
  });
});
