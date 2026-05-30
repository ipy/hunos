import { test, expect } from "../fixtures/app";
import { noteIdFromListItem, openNoteById } from "../helpers/notes";
import { WELCOME_NOTE_TITLE } from "../helpers/playground";

test.describe("title autosave flush on note switch", () => {
  test("persists renamed title when switching before debounce", async ({
    page,
  }) => {
    const playgroundId = await noteIdFromListItem(page, "格式试炼场");
    const welcomeId = await noteIdFromListItem(page, WELCOME_NOTE_TITLE);

    await openNoteById(page, playgroundId);
    const titleInput = page.getByTestId("note-title");
    await titleInput.fill("TitleFlush111");

    await openNoteById(page, welcomeId);
    await expect(page.getByTestId("note-title")).toHaveValue(WELCOME_NOTE_TITLE);

    await openNoteById(page, playgroundId);
    await expect(titleInput).toHaveValue("TitleFlush111");
  });
});
