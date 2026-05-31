import { test, expect } from "../fixtures/app";
import {
  FORMAT_PLAYGROUND_TITLE,
  GATE_VIEWPORT,
  editorLocator,
} from "../helpers/playground";
import {
  assertBacklinkSnippetPlainText,
  clickEachIncomingBacklinkByFreshTestId,
  collectIncomingBacklinkRowTestIds,
  expandBacklinksPanelIfCollapsed,
  expectBacklinkNavigationHash,
  incomingBacklinkTargetNoteId,
  openProjectDocsWithBacklinksPanel,
  waitForIncomingBacklinkRowCount,
} from "../helpers/backlinks";
import { openNoteFromList } from "../helpers/notes";

const DESKTOP_VIEWPORT = { width: 1280, height: 720 } as const;

const BACKLINKS_VIEWPORTS = [
  { label: "mobile 606×844", viewport: GATE_VIEWPORT },
  { label: "desktop", viewport: DESKTOP_VIEWPORT },
] as const;

test.describe("backlinks footer — iter 61", () => {
  for (const { label, viewport } of BACKLINKS_VIEWPORTS) {
    test.describe(label, () => {
      test.use({ viewport });

      test.beforeEach(async ({ page }) => {
        await openProjectDocsWithBacklinksPanel(page);
      });

      test("AC60-backlinks-stable-testid: row testids survive note switch and graph reload", async ({
        page,
      }) => {
        await expandBacklinksPanelIfCollapsed(page);
        const before = await collectIncomingBacklinkRowTestIds(page);

        await openNoteFromList(page, FORMAT_PLAYGROUND_TITLE);
        await expect(page.getByTestId("note-title")).toHaveValue(
          FORMAT_PLAYGROUND_TITLE,
          { timeout: 15_000 },
        );

        await openProjectDocsWithBacklinksPanel(page);
        await expandBacklinksPanelIfCollapsed(page);
        const after = await collectIncomingBacklinkRowTestIds(page);

        expect(after).toEqual(before);
        expect(new Set(after).size).toBe(2);
      });

      test("AC60-backlinks-e2e-navigation: multi-hop nav via stable row testids", async ({
        page,
      }) => {
        await expandBacklinksPanelIfCollapsed(page);
        await clickEachIncomingBacklinkByFreshTestId(
          page,
          FORMAT_PLAYGROUND_TITLE,
        );
      });

      test("AC60-backlink-snippet-delimiters: snippets are plain text via snippet testid", async ({
        page,
      }) => {
        await expandBacklinksPanelIfCollapsed(page);

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
        expect(snippets.join(" ")).toMatch(/#42/);
      });

      test("AC61-backlinks-nav-hash: row click sets location.hash to target note id", async ({
        page,
      }) => {
        await expandBacklinksPanelIfCollapsed(page);
        const rowTestIds = await collectIncomingBacklinkRowTestIds(page);

        for (const rowTestId of rowTestIds) {
          await openProjectDocsWithBacklinksPanel(page);
          await expandBacklinksPanelIfCollapsed(page);
          const expectedNoteId = await incomingBacklinkTargetNoteId(
            page,
            rowTestId,
          );
          await page.getByTestId(rowTestId).click();
          await expectBacklinkNavigationHash(page, expectedNoteId);
          await expect(page.getByTestId("note-title")).toHaveValue(
            FORMAT_PLAYGROUND_TITLE,
            { timeout: 15_000 },
          );
          expect(await page.evaluate(() => window.location.hash)).not.toContain(
            encodeURIComponent(FORMAT_PLAYGROUND_TITLE),
          );
        }
      });

      test("AC62-backlink-snippet-disambiguate: rows show distinct section prefixes", async ({
        page,
      }) => {
        await expandBacklinksPanelIfCollapsed(page);
        const rowTestIds = await collectIncomingBacklinkRowTestIds(page);
        const prefixes: string[] = [];

        for (const rowTestId of rowTestIds) {
          const linkId = rowTestId.replace(/^backlinks-item-/, "");
          const text = await page
            .getByTestId(`backlinks-snippet-${linkId}`)
            .innerText();
          assertBacklinkSnippetPlainText(text);
          prefixes.push(text.split(" · ")[0] ?? text);
        }

        expect(new Set(prefixes).size).toBe(2);
        expect(prefixes.join(" ")).toMatch(/标签与链接/);
        expect(prefixes.join(" ")).toMatch(/自由试炼/);
      });
    });
  }

  test.describe("mobile 606×844 — iter 59 regression", () => {
    test.use({ viewport: GATE_VIEWPORT });

    test.beforeEach(async ({ page }) => {
      await openProjectDocsWithBacklinksPanel(page);
    });

    test("AC58-backlinks-e2e: zh footer, two distinct rows, navigation by testid", async ({
      page,
    }) => {
      const panel = page.getByTestId("backlinks-panel");
      await expect(panel.getByText("LINKS TO", { exact: false })).toHaveCount(
        0,
      );

      const toggle = page.getByTestId("backlinks-panel-toggle");
      await expect(toggle).toContainText("链接");
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
      await waitForIncomingBacklinkRowCount(page, 2);
      await clickEachIncomingBacklinkByFreshTestId(
        page,
        FORMAT_PLAYGROUND_TITLE,
      );
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
      await expect(toggle).toContainText("链接 (2)");

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

  test.describe("desktop — iter 59 regression", () => {
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
