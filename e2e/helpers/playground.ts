import { expect, type Page } from "@playwright/test";
import { isHarmonyRuntime } from "./e2e-runtime";
import { resolveE2eAppUrl } from "./e2e-url";
import { noteListItem, openNoteFromList } from "./notes";
import { resetHunosDatabase } from "./storage";

export const FORMAT_PLAYGROUND_TITLE = "格式试炼场";
export const WELCOME_NOTE_TITLE = "欢迎使用 Hunos";
/** DevLoop autosave debounce is 400ms; testers waited ≥700–800ms. */
export const AUTOSAVE_WAIT_MS = 800;

export async function gotoApp(page: Page): Promise<void> {
  await page.goto(resolveE2eAppUrl());
  await expect(page.getByTestId("note-list")).toBeVisible();
}

/** Reset app state — web loads Vite; harmony reloads ArkWeb on emulator (no localhost). */
export async function gotoFreshApp(page: Page): Promise<void> {
  if (isHarmonyRuntime()) {
    await expect(page.locator("#root")).toBeAttached({ timeout: 30_000 });
    try {
      await resetHunosDatabase(page);
    } catch {
      // file:// / resource origins may block IDB delete — continue with reload
    }
    await page.reload({ waitUntil: "domcontentloaded" });
  } else {
    await page.goto(resolveE2eAppUrl());
    await resetHunosDatabase(page);
    await page.reload({ waitUntil: "domcontentloaded" });
  }
  await expect(page.getByTestId("note-list")).toBeVisible();
  await expect(noteListItem(page, FORMAT_PLAYGROUND_TITLE).first()).toBeVisible({
    timeout: 15_000,
  });
}

export async function openFormatPlayground(page: Page): Promise<void> {
  await openNoteFromList(page, FORMAT_PLAYGROUND_TITLE);
}

export async function restoreFormatPlayground(page: Page): Promise<void> {
  const restore = page.getByTestId("restore-playground-button");
  await expect(restore).toBeVisible();
  await restore.click();
  await expect(page.getByTestId("restore-playground-confirm")).toBeVisible();
  await page.getByTestId("restore-playground-confirm-confirm").click();
  await page.waitForTimeout(AUTOSAVE_WAIT_MS);
}

/** Open playground and reset to canonical zh seed (DevLoop iter 83+ pattern). */
export async function openCleanFormatPlayground(page: Page): Promise<void> {
  await openFormatPlayground(page);
  await restoreFormatPlayground(page);
}

/** Open canonical 格式试炼场 from fresh DB seed (no restore chip). */
export async function openFormatPlaygroundToc(page: Page): Promise<void> {
  await openFormatPlayground(page);
  await expect(page.getByTestId("restore-playground-button")).toHaveCount(0);
}

export function editorLocator(page: Page) {
  return page.getByTestId("note-editor").locator(".ProseMirror");
}

export async function appendEditorLine(
  page: Page,
  text: string,
): Promise<void> {
  const editor = editorLocator(page);
  await editor.click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  const delay = isHarmonyRuntime() ? 30 : 0;
  await page.keyboard.type(text, { delay });
}

/** Insert a heading at the end of the note (markdown shortcut on web; bridge on Harmony). */
export async function appendEditorHeading(
  page: Page,
  level: 1 | 2 | 3,
  text: string,
): Promise<void> {
  if (isHarmonyRuntime()) {
    const ok = await page.evaluate(
      ({ lvl, headingText }) => {
        const bridge = (
          window as Window & {
            __hunosE2e?: {
              insertHeadingAtEnd: (l: 1 | 2 | 3, t: string) => boolean;
            };
          }
        ).__hunosE2e;
        return bridge?.insertHeadingAtEnd(lvl as 1 | 2 | 3, headingText) ?? false;
      },
      { lvl: level, headingText: text },
    );
    if (!ok) {
      throw new Error("appendEditorHeading: __hunosE2e.insertHeadingAtEnd failed");
    }
    await page.waitForTimeout(300);
    return;
  }
  const prefix = `${"#".repeat(level)} `;
  await appendEditorLine(page, `${prefix}${text}`);
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
}

export async function clearTagFilter(page: Page): Promise<void> {
  const bridged = await page.evaluate(() => {
    const bridge = (
      window as Window & { __hunosE2e?: { clearTagFilter: () => void } }
    ).__hunosE2e;
    if (!bridge?.clearTagFilter) return false;
    bridge.clearTagFilter();
    return true;
  });
  if (!bridged) {
    await page.getByText("全部笔记", { exact: true }).first().click();
  }
  await expect(page.getByTestId("note-list-tag-filter")).toHaveCount(0, {
    timeout: 15_000,
  });
}
