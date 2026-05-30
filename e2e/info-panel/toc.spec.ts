import { test, expect } from "../fixtures/app";
import {
  appendEditorHeading,
  editorLocator,
  openCleanFormatPlayground,
} from "../helpers/playground";

test.describe("info panel TOC", () => {
  test.beforeEach(async ({ page }) => {
    await openCleanFormatPlayground(page);
    await page.getByTestId("info-panel-toggle").click();
    await expect(page.getByTestId("info-panel")).toBeVisible();
    await page.getByTestId("info-panel-tab-toc").click();
    await expect(page.getByTestId("info-panel-toc-list")).toBeVisible();
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
