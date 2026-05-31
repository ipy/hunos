import { test, expect } from "../fixtures/app";
import { openNoteFromList } from "../helpers/notes";
import {
  FORMAT_PLAYGROUND_TITLE,
  GATE_VIEWPORT,
  PROJECT_DOCS_NOTE_TITLE,
  WELCOME_NOTE_TITLE,
  clickWikiLinkWithoutScroll,
  editorLocator,
  expectWikiLinkHashNavigation,
  openFormatPlaygroundInfoPanelToc,
  openFormatPlaygroundToc,
  wikiLinkByLinkKey,
  wikiLinkByTitle,
} from "../helpers/playground";

test.describe("wiki-link graph navigation", () => {
  test.beforeEach(async ({ page }) => {
    await openFormatPlaygroundToc(page);
  });

  test("e2e-wiki-link-restore-setup: fresh seed opens playground without restore chip", async ({
    page,
  }) => {
    await expect(page.getByTestId("restore-playground-button")).toHaveCount(0);
    await expect(page.getByTestId("note-editor")).toBeVisible();
    await expect(editorLocator(page)).toContainText("格式试炼场");
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
    await expect(link.first()).toBeAttached();
    await clickWikiLinkWithoutScroll(page, PROJECT_DOCS_NOTE_TITLE);

    await expectWikiLinkHashNavigation(page, PROJECT_DOCS_NOTE_TITLE);
    await expect(page.getByTestId("note-title")).toHaveValue(
      PROJECT_DOCS_NOTE_TITLE,
      { timeout: 15_000 },
    );
    await expect(editorLocator(page)).toContainText("格式试炼场中的示例笔记");
  });

  test("AC42-wiki-link-offscreen-welcome: welcome link at editor scrollTop 0", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const pane = document.querySelector('[data-testid="editor-scroll-pane"]');
      if (pane instanceof HTMLElement) pane.scrollTop = 0;
    });

    const link = wikiLinkByTitle(page, WELCOME_NOTE_TITLE);
    await expect(link.first()).toBeAttached();
    await clickWikiLinkWithoutScroll(page, WELCOME_NOTE_TITLE);

    await expectWikiLinkHashNavigation(page, WELCOME_NOTE_TITLE);
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

    await expect
      .poll(async () => page.getByTestId("backlinks-panel").count())
      .toBeGreaterThan(0);

    await page.evaluate(() => {
      const pane = document.querySelector('[data-testid="editor-scroll-pane"]');
      if (pane instanceof HTMLElement) pane.scrollTop = pane.scrollHeight;
    });

    const panel = page.getByTestId("backlinks-panel");
    await expect(panel).toBeVisible({ timeout: 15_000 });

    const backlink = panel
      .getByTestId("backlinks-incoming-section")
      .locator(`[data-note-title="${FORMAT_PLAYGROUND_TITLE}"]`)
      .first();
    if (!(await backlink.isVisible())) {
      await page.getByTestId("backlinks-panel-toggle").click();
    }
    await expect(backlink).toBeVisible({ timeout: 30_000 });
    await backlink.click();

    await expect(page.getByTestId("note-title")).toHaveValue(
      FORMAT_PLAYGROUND_TITLE,
    );
    await expect(editorLocator(page)).toContainText("格式试炼场");
  });

  test("AC54-wiki-link-unique-dom: two 项目文档 links are individually clickable", async ({
    page,
  }) => {
    const links = wikiLinkByTitle(page, PROJECT_DOCS_NOTE_TITLE);
    await expect(links).toHaveCount(2);

    const linkKeys = await links.evaluateAll((elements) =>
      elements.map((el) => el.getAttribute("data-link-key")),
    );
    expect(new Set(linkKeys).size).toBe(2);
    expect(linkKeys.every((key) => key && key.length > 0)).toBe(true);

    const firstKey = linkKeys[0]!;
    const secondKey = linkKeys[1]!;
    expect(firstKey).not.toBe(secondKey);

    await clickWikiLinkWithoutScroll(page, PROJECT_DOCS_NOTE_TITLE, 0);
    await expect(page.getByTestId("note-title")).toHaveValue(
      PROJECT_DOCS_NOTE_TITLE,
      { timeout: 15_000 },
    );

    await openNoteFromList(page, FORMAT_PLAYGROUND_TITLE);
    await expect(wikiLinkByLinkKey(page, secondKey)).toBeAttached();
    await clickWikiLinkWithoutScroll(page, PROJECT_DOCS_NOTE_TITLE, 1);
    await expect(page.getByTestId("note-title")).toHaveValue(
      PROJECT_DOCS_NOTE_TITLE,
      { timeout: 15_000 },
    );
  });
});

test.describe("info panel done — iter 56 gate", () => {
  test.use({ viewport: GATE_VIEWPORT });

  test("AC55-info-panel-done: 完成 closes panel and refocuses editor", async ({
    page,
  }) => {
    await openFormatPlaygroundInfoPanelToc(page);
    await page.getByTestId("info-panel-done").click();
    await expect(page.getByTestId("info-panel")).toBeHidden();
    await expect(page.locator(".ProseMirror-focused")).toBeVisible({
      timeout: 15_000,
    });
  });
});
