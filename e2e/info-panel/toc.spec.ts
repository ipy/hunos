import { test, expect } from "../fixtures/app";
import {
  appendEditorHeading,
  editorLocator,
  openCleanFormatPlayground,
} from "../helpers/playground";

const GATE_VIEWPORT = { width: 606, height: 844 };

async function openPlaygroundToc(page: import("@playwright/test").Page) {
  await openCleanFormatPlayground(page);
  await page.setViewportSize(GATE_VIEWPORT);
  await page.getByTestId("info-panel-toggle").click();
  await expect(page.getByTestId("info-panel")).toBeVisible();
  await page.getByTestId("info-panel-tab-toc").click();
  await expect(page.getByTestId("info-panel-toc-list")).toBeVisible();
}

test.describe("info panel TOC", () => {
  test.beforeEach(async ({ page }) => {
    await openPlaygroundToc(page);
  });

  test("live heading appears in TOC without closing panel", async ({
    page,
  }) => {
    await appendEditorHeading(page, 2, "E2E Live Heading");
    await expect(
      page.getByTestId("info-panel-toc-list").getByText("E2E Live Heading"),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("info-panel")).toBeVisible();
  });

  test("tapping TOC entry scrolls editor while panel stays open", async ({
    page,
  }) => {
    const entry = page
      .getByTestId("info-panel-toc-list")
      .getByText("自由试炼")
      .first();
    await entry.click();
    await expect(page.getByTestId("info-panel")).toBeVisible();
    await expect(editorLocator(page)).toContainText("自由试炼");
  });
});

test.describe("info panel TOC — iter 49 gate", () => {
  test.use({ viewport: GATE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await openPlaygroundToc(page);
  });

  test("AC46-toc-bottom-padding: last rows scroll inside list with bottom inset", async ({
    page,
  }) => {
    const list = page.getByTestId("info-panel-toc-list");
    const metrics = await list.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      paddingBottom: getComputedStyle(el).paddingBottom,
    }));

    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
    expect(parseFloat(metrics.paddingBottom)).toBeGreaterThanOrEqual(48);

    await list.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    await expect(list.getByText("标签与链接")).toBeVisible();
    await expect(list.getByText("自由试炼")).toBeVisible();
  });

  test("AC44-toc-first-click: entry-11 scrolls editor from scrollTop 0", async ({
    page,
  }) => {
    await page.evaluate(() => {
      const editorPane = document.querySelector(
        '[data-testid="editor-scroll-pane"]',
      );
      if (editorPane instanceof HTMLElement) editorPane.scrollTop = 0;
      const tocList = document.querySelector(
        '[data-testid="info-panel-toc-list"]',
      );
      if (tocList instanceof HTMLElement) tocList.scrollTop = 0;
    });

    const editorScrollBefore = await page.evaluate(() => {
      const editorPane = document.querySelector(
        '[data-testid="editor-scroll-pane"]',
      );
      return editorPane instanceof HTMLElement ? editorPane.scrollTop : 0;
    });
    expect(editorScrollBefore).toBe(0);

    await page.getByTestId("info-panel-toc-entry-11").click({ force: true });

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const editorPane = document.querySelector(
            '[data-testid="editor-scroll-pane"]',
          );
          return editorPane instanceof HTMLElement ? editorPane.scrollTop : 0;
        }),
      )
      .toBeGreaterThan(0);

    await expect(editorLocator(page)).toContainText("自由试炼");
  });

  test("AC46-toc-click-activation: 标签与链接 scrolls editor and reveals wiki link", async ({
    page,
  }) => {
    await page.getByTestId("info-panel-toc-entry-10").click();

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const editorPane = document.querySelector(
            '[data-testid="editor-scroll-pane"]',
          );
          return editorPane instanceof HTMLElement ? editorPane.scrollTop : 0;
        }),
      )
      .toBeGreaterThan(0);

    await expect(editorLocator(page)).toContainText("标签与链接");
    await expect(editorLocator(page)).toContainText("项目文档");
  });

  test("AC43-toc-jump: one click on 标签与链接 shows heading and wiki link", async ({
    page,
  }) => {
    await page
      .getByTestId("info-panel-toc-list")
      .getByText("标签与链接")
      .click();

    await expect(editorLocator(page)).toContainText("标签与链接");
    await expect(editorLocator(page)).toContainText("项目文档");
    await expect(page.getByTestId("info-panel")).toBeVisible();
  });
});
