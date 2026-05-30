import { test, expect } from "../fixtures/app";
import {
  appendEditorLine,
  editorLocator,
  openCleanFormatPlayground,
} from "../helpers/playground";

test.describe("inline markdown in format playground", () => {
  test.beforeEach(async ({ page }) => {
    await openCleanFormatPlayground(page);
  });

  test("converts strike via ~~ delimiters", async ({ page }) => {
    const editor = editorLocator(page);
    await appendEditorLine(page, "~~StrikeE2E~~ ");
    const strike = editor.locator("s").filter({ hasText: "StrikeE2E" });
    await expect(strike).toBeVisible();
    await expect(editor).not.toContainText("~~StrikeE2E~~");
  });

  test("converts highlight via == delimiters", async ({ page }) => {
    const editor = editorLocator(page);
    await appendEditorLine(page, "==HighlightE2E== ");
    const mark = editor.locator("mark").filter({ hasText: "HighlightE2E" });
    await expect(mark).toBeVisible();
    await expect(editor).not.toContainText("==HighlightE2E==");
  });

  test("converts bold via ** delimiters", async ({ page }) => {
    const editor = editorLocator(page);
    await appendEditorLine(page, "**BoldE2E** ");
    const strong = editor.locator("strong").filter({ hasText: "BoldE2E" });
    await expect(strong).toBeVisible();
  });
});
