import { test, expect } from "../fixtures/app";
import {
  FORMAT_PLAYGROUND_TITLE,
  GATE_VIEWPORT,
  editorLocator,
} from "../helpers/playground";
import {
  assertBacklinkSnippetPlainText,
  collectIncomingBacklinkRowTestIds,
  expandBacklinksPanelIfCollapsed,
  openProjectDocsWithBacklinksPanel,
  waitForIncomingBacklinkRowCount,
} from "../helpers/backlinks";

const DESKTOP_VIEWPORT = { width: 1280, height: 720 } as const;

test.describe("backlinks footer — iter 59", () => {
  test.describe("mobile 606×844", () => {
    test.use({ viewport: GATE_VIEWPORT });

    test.beforeEach(async ({ page }) => {
      await openProjectDocsWithBacklinksPanel(page);
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
      await waitForIncomingBacklinkRowCount(page, 2);

      const incoming = page.getByTestId("backlinks-incoming-section");
      await expect(incoming.getByText("引用自")).toBeVisible();
      const rowTestIds = await collectIncomingBacklinkRowTestIds(page);
      expect(new Set(rowTestIds).size).toBe(2);

      for (const rowTestId of rowTestIds) {
        await openProjectDocsWithBacklinksPanel(page);
        await expandBacklinksPanelIfCollapsed(page);
        const row = page.getByTestId(rowTestId);
        await expect(row).toBeVisible({ timeout: 15_000 });
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

    test("AC59-backlinks-e2e-distinct-nav: clicks each row via unique getByTestId", async ({
      page,
    }) => {
      await page.getByTestId("backlinks-panel-toggle").click();
      const rowTestIds = await collectIncomingBacklinkRowTestIds(page);
      for (const rowTestId of rowTestIds) {
        await openProjectDocsWithBacklinksPanel(page);
        await expandBacklinksPanelIfCollapsed(page);
        await page.getByTestId(rowTestId).click();
        await expect(page.getByTestId("note-title")).toHaveValue(
          FORMAT_PLAYGROUND_TITLE,
          { timeout: 15_000 },
        );
      }
    });

    test("AC59-backlinks-e2e-bootstrap: incoming row count is 2 before assertions", async ({
      page,
    }) => {
      await page.getByTestId("backlinks-panel-toggle").click();
      await waitForIncomingBacklinkRowCount(page, 2);
      const rows = page
        .getByTestId("backlinks-incoming-section")
        .locator('[data-testid^="backlinks-item-"]');
      await expect(rows).toHaveCount(2);
      expect(await rows.count()).not.toBe(10);
    });

    test("AC58-backlinks-expand-default: list closed until first toggle at 606×844", async ({
      page,
    }) => {
      const toggle = page.getByTestId("backlinks-panel-toggle");
      await expect(toggle).toContainText("反向链接 (2)");

      const incoming = page.getByTestId("backlinks-incoming-section");
      await expect(incoming).toHaveCount(0);

      await toggle.click();
      await waitForIncomingBacklinkRowCount(page, 2);

      const rowTestIds = await collectIncomingBacklinkRowTestIds(page);
      for (const rowTestId of rowTestIds) {
        await expect(page.getByTestId(rowTestId)).toBeVisible();
      }
    });

    test("AC58-backlink-snippet-preview / AC59-backlink-snippet-testid: snippets via snippet testid", async ({
      page,
    }) => {
      await page.getByTestId("backlinks-panel-toggle").click();
      await waitForIncomingBacklinkRowCount(page, 2);

      const rowTestIds = await collectIncomingBacklinkRowTestIds(page);
      const snippets: string[] = [];
      for (const rowTestId of rowTestIds) {
        const linkId = rowTestId.replace(/^backlinks-item-/, "");
        const snippet = page.getByTestId(`backlinks-snippet-${linkId}`);
        await expect(snippet).toBeVisible();
        const text = await snippet.innerText();
        snippets.push(text);
        assertBacklinkSnippetPlainText(text);
      }
      expect(snippets[0]).not.toBe(snippets[1]);
    });

    test("AC59-backlink-snippet-hash: allows plain # in prose, rejects markdown tokens", async ({
      page,
    }) => {
      await page.getByTestId("backlinks-panel-toggle").click();
      await waitForIncomingBacklinkRowCount(page, 2);

      const rowTestIds = await collectIncomingBacklinkRowTestIds(page);
      const combined = [];
      for (const rowTestId of rowTestIds) {
        const linkId = rowTestId.replace(/^backlinks-item-/, "");
        const text = await page
          .getByTestId(`backlinks-snippet-${linkId}`)
          .innerText();
        combined.push(text);
        assertBacklinkSnippetPlainText(text);
      }
      expect(combined.join(" ")).toMatch(/#42/);
    });

    test("AC59-backlink-row-context: two rows show different context strings", async ({
      page,
    }) => {
      await page.getByTestId("backlinks-panel-toggle").click();
      await waitForIncomingBacklinkRowCount(page, 2);

      const rowTestIds = await collectIncomingBacklinkRowTestIds(page);
      const contexts: string[] = [];
      for (const rowTestId of rowTestIds) {
        const linkId = rowTestId.replace(/^backlinks-item-/, "");
        contexts.push(
          await page.getByTestId(`backlinks-snippet-${linkId}`).innerText(),
        );
      }
      expect(contexts[0]).not.toBe(contexts[1]);
      expect(contexts[0]!.length).toBeGreaterThan(0);
      expect(contexts[1]!.length).toBeGreaterThan(0);
    });
  });

  test.describe("desktop", () => {
    test.use({ viewport: DESKTOP_VIEWPORT });

    test("AC59-backlinks-e2e-bootstrap: desktop cold start shows exactly two incoming rows", async ({
      page,
    }) => {
      await openProjectDocsWithBacklinksPanel(page);
      await page.getByTestId("backlinks-panel-toggle").click();
      await waitForIncomingBacklinkRowCount(page, 2);
      await expect(
        page
          .getByTestId("backlinks-incoming-section")
          .locator('[data-testid^="backlinks-item-"]'),
      ).toHaveCount(2);
    });
  });
});
