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
    );

    const toggle = page.getByTestId("backlinks-panel-toggle");
    if (await toggle.isVisible()) {
      await toggle.click();
    }
    await expect(page.getByTestId("backlinks-panel")).toBeVisible();

    const incoming = page
      .getByTestId("backlinks-incoming-section")
      .locator(`[data-note-title="${FORMAT_PLAYGROUND_TITLE}"]`)
      .first();
    await expect(incoming).toBeVisible();
    await incoming.click();

    await expect(page.getByTestId("note-title")).toHaveValue(
      FORMAT_PLAYGROUND_TITLE,
    );
    await expect(editorLocator(page)).toContainText("格式试炼场");
  });
});
