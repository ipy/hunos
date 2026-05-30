import { test, expect } from "../fixtures/app";
import {
  FORMAT_PLAYGROUND_TITLE,
  WELCOME_NOTE_TITLE,
  editorLocator,
  openCleanFormatPlayground,
} from "../helpers/playground";

test.describe("wiki-link graph navigation", () => {
  test.beforeEach(async ({ page }) => {
    await openCleanFormatPlayground(page);
  });

  test("seed wiki-link navigates to welcome note and back via backlinks", async ({
    page,
  }) => {
    const link = page
      .locator(
        `[data-testid="wiki-link-target"][data-wiki-title="${WELCOME_NOTE_TITLE}"]`,
      )
      .first();
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
