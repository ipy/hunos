import { test, expect } from "../fixtures/app";
import {
  createNoteViaShortcut,
  focusEditorAtEnd,
  noteIdFromListItem,
  openNoteById,
  readNoteContentPlain,
} from "../helpers/notes";
import { editorLocator } from "../helpers/playground";

test.describe("pending autosave flush on note switch", () => {
  test("rapid switch persists typed marker before debounce", async ({
    page,
  }) => {
    const marker = `E2E-FLUSH-${Date.now()}`;
    const titleA = `E2E Flush A ${Date.now()}`;
    const titleB = `E2E Flush B ${Date.now()}`;

    await createNoteViaShortcut(page, titleA, "BaselineA");
    await createNoteViaShortcut(page, titleB, "BaselineB");

    const idA = await noteIdFromListItem(page, titleA);
    const idB = await noteIdFromListItem(page, titleB);

    await openNoteById(page, idA);
    await focusEditorAtEnd(page);
    await page.keyboard.type(marker);

    await openNoteById(page, idB);
    await openNoteById(page, idA);

    const editor = editorLocator(page);
    await expect(editor).toContainText(marker);

    const plain = await readNoteContentPlain(page, idA);
    expect(plain).toContain(marker);

    await page.reload();
    await expect(page.getByTestId("note-list")).toBeVisible();
    await openNoteById(page, idA);
    await expect(editorLocator(page)).toContainText(marker);
  });

  test("visibilitychange hidden flushes pending edits to IndexedDB", async ({
    page,
  }) => {
    const marker = `E2E-VIS-${Date.now()}`;
    const title = `E2E Vis ${Date.now()}`;

    await createNoteViaShortcut(page, title, "VisBase");
    const noteId = await noteIdFromListItem(page, title);

    await openNoteById(page, noteId);
    await focusEditorAtEnd(page);
    await page.keyboard.type(marker);

    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        get: () => "hidden",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await page.waitForTimeout(300);
    await page.reload();
    await expect(page.getByTestId("note-list")).toBeVisible();

    const plain = await readNoteContentPlain(page, noteId);
    expect(plain).toContain(marker);
  });
});
