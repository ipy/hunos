import { test, expect } from "../fixtures/app";
import {
  appendEditorHeading,
  editorLocator,
  GATE_VIEWPORT,
  openFormatPlaygroundInfoPanelToc,
} from "../helpers/playground";

test.describe("info panel TOC", () => {
  test.use({ viewport: GATE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await openFormatPlaygroundInfoPanelToc(page);
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
    await openFormatPlaygroundInfoPanelToc(page);
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

    const list = page.getByTestId("info-panel-toc-list");
    const listBox = await list.boundingBox();
    const entry = page.getByTestId("info-panel-toc-entry-11");
    const box = await entry.boundingBox();
    expect(box).not.toBeNull();
    expect(listBox).not.toBeNull();
    // Entry-11 sits below the TOC fold; tap the visible list bottom edge (not off-screen bbox).
    const clickY =
      box!.y + box!.height > listBox!.y + listBox!.height
        ? listBox!.y + listBox!.height - 1
        : box!.y + 4;
    await page.mouse.click(box!.x + 16, clickY);

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const tocList = document.querySelector(
            '[data-testid="info-panel-toc-list"]',
          );
          return tocList instanceof HTMLElement ? tocList.scrollTop : 0;
        }),
      )
      .toBeLessThan(1);

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
