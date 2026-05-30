import { test, expect } from "../fixtures/app";
import {
  createNoteViaShortcut,
  editorUndo,
  openNoteFromList,
} from "../helpers/notes";
import { editorLocator } from "../helpers/playground";

test.describe("note create, switch, undo isolation", () => {
  test("undo in note B does not affect note A", async ({ page }) => {
    await createNoteViaShortcut(page, "E2E Alpha", "UndoScopeAlpha");
    await openNoteFromList(page, "格式试炼场");
    await createNoteViaShortcut(page, "E2E Beta", "UndoScopeBeta");

    const editor = editorLocator(page);
    await expect(editor).toContainText("UndoScopeBeta");

    await editorUndo(page);
    await expect(editor).not.toContainText("UndoScopeBeta");

    await openNoteFromList(page, "E2E Alpha");
    await expect(editor).toContainText("UndoScopeAlpha");
  });

  test("rapid note switch keeps editor mounted", async ({ page }) => {
    await createNoteViaShortcut(page, "E2E Switch A", "ContentA");
    await createNoteViaShortcut(page, "E2E Switch B", "ContentB");

    await openNoteFromList(page, "格式试炼场");
    await openNoteFromList(page, "E2E Switch A");
    await openNoteFromList(page, "E2E Switch B");
    await openNoteFromList(page, "欢迎使用 Hunos");

    await expect(page.getByTestId("note-editor")).toBeVisible();
    await expect(editorLocator(page)).toBeVisible();
  });
});
