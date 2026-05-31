import { test, expect } from "../fixtures/app";
import {
  FORMAT_PLAYGROUND_TITLE,
  PROJECT_DOCS_NOTE_TITLE,
  WELCOME_NOTE_TITLE,
  editorLocator,
  openCleanFormatPlayground,
  wikiLinkByTitle,
} from "../helpers/playground";

test.describe("wiki-link graph navigation", () => {
  test.beforeEach(async ({ page }) => {
    await openCleanFormatPlayground(page);
  });

  test("AC42-wiki-link-offscreen: 项目文档 link at editor scrollTop 0", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const pane = document.querySelector('[data-testid="editor-scroll-pane"]');
      if (pane instanceof HTMLElement) pane.scrollTop = 0;
    });

    const scrollBefore = await page.evaluate(() => {
      const pane = document.querySelector('[data-testid="editor-scroll-pane"]');
      return pane instanceof HTMLElement ? pane.scrollTop : -1;
    });
    expect(scrollBefore).toBe(0);

    const link = wikiLinkByTitle(page, PROJECT_DOCS_NOTE_TITLE);
    await link.click({ force: true });

    await expect(page.getByTestId("note-title")).toHaveValue(
      PROJECT_DOCS_NOTE_TITLE,
      { timeout: 15_000 },
    );
  });

  test("AC42-wiki-link-offscreen-welcome: welcome link at editor scrollTop 0", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const pane = document.querySelector('[data-testid="editor-scroll-pane"]');
      if (pane instanceof HTMLElement) pane.scrollTop = 0;
    });

    const link = wikiLinkByTitle(page, WELCOME_NOTE_TITLE);
    await link.click({ force: true });

    await expect(page.getByTestId("note-title")).toHaveValue(
      WELCOME_NOTE_TITLE,
      { timeout: 15_000 },
    );
  });

  test("seed wiki-link navigates to welcome note and back via backlinks", async ({
    page,
  }) => {
    const link = wikiLinkByTitle(page, WELCOME_NOTE_TITLE);
    await expect(link).toBeVisible();
    await link.click();

    await expect(page.getByTestId("note-title")).toHaveValue(
      WELCOME_NOTE_TITLE,
      { timeout: 15_000 },
    );

    await page.keyboard.press("Escape");
    const panel = page.getByTestId("backlinks-panel");
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await panel.scrollIntoViewIfNeeded();

    const backlink = panel.getByText(FORMAT_PLAYGROUND_TITLE).first();
    const incoming = page
      .getByTestId("backlinks-incoming-section")
      .locator(`[data-note-title="${FORMAT_PLAYGROUND_TITLE}"]`)
      .first();
    if (!(await incoming.isVisible())) {
      await page.getByTestId("backlinks-panel-toggle").click();
    }
    await expect(backlink).toBeVisible({ timeout: 30_000 });
    await backlink.click();

    await expect(page.getByTestId("note-title")).toHaveValue(
      FORMAT_PLAYGROUND_TITLE,
    );
    await expect(editorLocator(page)).toContainText("格式试炼场");
  });
});
