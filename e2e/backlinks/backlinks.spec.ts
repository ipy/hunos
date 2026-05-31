import { test, expect } from "../fixtures/app";
import { openNoteFromList } from "../helpers/notes";
import {
  FORMAT_PLAYGROUND_TITLE,
  GATE_VIEWPORT,
  PROJECT_DOCS_NOTE_TITLE,
  editorLocator,
} from "../helpers/playground";

async function scrollEditorToBacklinks(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const pane = document.querySelector('[data-testid="editor-scroll-pane"]');
    if (pane instanceof HTMLElement) pane.scrollTop = pane.scrollHeight;
  });
}

test.describe("backlinks footer — iter 58", () => {
  test.use({ viewport: GATE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await openNoteFromList(page, PROJECT_DOCS_NOTE_TITLE);
    await expect(page.getByTestId("note-title")).toHaveValue(
      PROJECT_DOCS_NOTE_TITLE,
      { timeout: 15_000 },
    );
    await expect
      .poll(async () => page.getByTestId("backlinks-panel").count())
      .toBeGreaterThan(0);
    await scrollEditorToBacklinks(page);
    await expect(page.getByTestId("backlinks-panel")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("AC58-backlinks-e2e: zh footer, two distinct rows, navigation by testid", async ({
    page,
  }) => {
    const panel = page.getByTestId("backlinks-panel");
    await expect(panel.getByText("LINKS TO", { exact: false })).toHaveCount(0);

    const toggle = page.getByTestId("backlinks-panel-toggle");
    await expect(toggle).toContainText("反向链接");
    await expect(toggle).toContainText("(2)");
    await toggle.click();

    const incoming = page.getByTestId("backlinks-incoming-section");
    await expect(incoming.getByText("引用自")).toBeVisible();
    const rows = incoming.locator('[data-testid^="backlinks-item-"]');
    await expect(rows).toHaveCount(2);

    const testIds = await rows.evaluateAll((els) =>
      els.map((el) => el.getAttribute("data-testid")),
    );
    expect(new Set(testIds).size).toBe(2);
    expect(testIds.every((id) => id?.startsWith("backlinks-item-"))).toBe(true);

    for (let index = 0; index < 2; index += 1) {
      await openNoteFromList(page, PROJECT_DOCS_NOTE_TITLE);
      await expect
        .poll(async () => page.getByTestId("backlinks-panel").count())
        .toBeGreaterThan(0);
      await scrollEditorToBacklinks(page);
      const footer = page.getByTestId("backlinks-panel");
      if (
        (await page.getByTestId("backlinks-incoming-section").count()) === 0
      ) {
        await footer.getByTestId("backlinks-panel-toggle").click();
      }
      const sectionRows = footer
        .getByTestId("backlinks-incoming-section")
        .locator('[data-testid^="backlinks-item-"]');
      await expect(sectionRows).toHaveCount(2);
      const row = sectionRows.nth(index);
      await expect(row).toBeVisible({ timeout: 15_000 });
      const rowTestId = await row.getAttribute("data-testid");
      expect(rowTestId).toMatch(/^backlinks-item-/);
      await expect(row).toHaveAttribute(
        "data-note-title",
        FORMAT_PLAYGROUND_TITLE,
      );
      await row.click();
      await expect(page.getByTestId("note-title")).toHaveValue(
        FORMAT_PLAYGROUND_TITLE,
        { timeout: 15_000 },
      );
      await expect(editorLocator(page)).toContainText("格式试炼场");
    }
  });

  test("AC58-backlinks-expand-default: list closed until first toggle at 606×844", async ({
    page,
  }) => {
    const toggle = page.getByTestId("backlinks-panel-toggle");
    await expect(toggle).toContainText("反向链接 (2)");

    const incoming = page.getByTestId("backlinks-incoming-section");
    await expect(incoming).toHaveCount(0);

    await toggle.click();

    const rows = page
      .getByTestId("backlinks-incoming-section")
      .locator('[data-testid^="backlinks-item-"]');
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toBeVisible();
    await expect(rows.nth(1)).toBeVisible();
  });

  test("AC58-backlink-snippet-preview: snippets omit raw markdown syntax", async ({
    page,
  }) => {
    await page.getByTestId("backlinks-panel-toggle").click();

    const rows = page
      .getByTestId("backlinks-incoming-section")
      .locator('[data-testid^="backlinks-item-"]');
    await expect(rows).toHaveCount(2);

    for (let i = 0; i < 2; i += 1) {
      const text = await rows.nth(i).locator("div").nth(1).innerText();
      expect(text).not.toMatch(/\*\*/);
      expect(text).not.toMatch(/\[\[/);
      expect(text).not.toContain("#");
      expect(text.length).toBeGreaterThan(0);
    }
  });
});
