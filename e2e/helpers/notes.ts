import { expect, type Locator, type Page } from "@playwright/test";
import { isMobileAppLayout, viaE2eBridge } from "./interactions";
import { AUTOSAVE_WAIT_MS } from "./playground";

const HUNOS_DB = "hunos";

/** Swipeable card: click inner row (`children[1]`), not the outer wrapper (DevLoop iter 109). */
export function noteListItem(page: Page, title: string): Locator {
  return page.getByTestId("note-list-item").filter({ hasText: title });
}

export async function openNoteFromList(
  page: Page,
  title: string,
): Promise<void> {
  const item = noteListItem(page, title).first();
  await expect(item).toBeVisible();
  await item.locator(":scope > div").nth(1).click();
  await expect(page.getByTestId("note-editor")).toBeVisible({
    timeout: 15_000,
  });
}

export async function createNoteViaShortcut(
  page: Page,
  title: string,
  body: string,
): Promise<void> {
  const mobile = await isMobileAppLayout(page);
  if (mobile) {
    const bridged = await page.evaluate(() => {
      const bridge = (
        window as Window & { __hunosE2e?: { createNote: () => Promise<unknown> } }
      ).__hunosE2e;
      if (bridge) {
        void bridge.createNote();
        return true;
      }
      return false;
    });
    if (!bridged) {
      await page.getByTestId("create-note-fab").click();
    }
  } else {
    await page.keyboard.press("Meta+n");
  }
  await expect(page.getByTestId("note-editor")).toBeVisible();
  const titleInput = page.getByTestId("note-title");
  if (mobile) {
    await expect(titleInput).toBeFocused({ timeout: 5_000 });
  } else {
    await titleInput.click();
  }
  await titleInput.fill(title);
  const editor = page.getByTestId("note-editor").locator(".ProseMirror");
  await editor.click();
  await page.keyboard.type(body);
  await page.waitForTimeout(AUTOSAVE_WAIT_MS);
}

export async function readNoteContentPlain(
  page: Page,
  noteId: string,
): Promise<string> {
  return page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("hunos");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("idb open failed"));
    });
    try {
      const note = await new Promise<{ contentPlain?: string } | undefined>(
        (resolve, reject) => {
          const r = db.transaction("notes", "readonly").objectStore("notes").get(id);
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        },
      );
      return note?.contentPlain ?? "";
    } finally {
      db.close();
    }
  }, noteId);
}

export async function noteIdFromListItem(
  page: Page,
  title: string,
): Promise<string> {
  const item = noteListItem(page, title).first();
  const id = await item.getAttribute("data-note-id");
  if (!id) throw new Error(`note-list-item missing data-note-id for: ${title}`);
  return id;
}

export async function focusEditorAtEnd(page: Page): Promise<void> {
  const editor = page.getByTestId("note-editor").locator(".ProseMirror");
  await editor.click();
  await page.keyboard.press("End");
}

export async function openNoteById(page: Page, noteId: string): Promise<void> {
  await page.locator(`[data-note-id="${noteId}"] > div`).nth(1).click();
  await expect(page.getByTestId("note-editor")).toBeVisible({ timeout: 15_000 });
}

export { HUNOS_DB };
