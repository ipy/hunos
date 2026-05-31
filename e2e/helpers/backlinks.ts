import { expect, type Page } from "@playwright/test";
import { PROJECT_DOCS_NOTE_TITLE } from "./playground";
import { openNoteFromList } from "./notes";

/** Markdown delimiters that must not appear in formatted backlink snippets. */
export const BACKLINK_SNIPPET_RAW_MARKDOWN_RE =
  /\*\*|__|~~|==|\[\[|\]\]|!\[|\]\(|`[^`]+`/;

export function assertBacklinkSnippetPlainText(text: string): void {
  expect(text.length).toBeGreaterThan(0);
  expect(text).not.toMatch(BACKLINK_SNIPPET_RAW_MARKDOWN_RE);
}

export async function scrollEditorToBacklinks(page: Page): Promise<void> {
  await page.evaluate(() => {
    const pane = document.querySelector('[data-testid="editor-scroll-pane"]');
    if (pane instanceof HTMLElement) pane.scrollTop = pane.scrollHeight;
  });
}

export async function openProjectDocsWithBacklinksPanel(
  page: Page,
): Promise<void> {
  await openNoteFromList(page, PROJECT_DOCS_NOTE_TITLE);
  await expect(page.getByTestId("note-title")).toHaveValue(
    PROJECT_DOCS_NOTE_TITLE,
    { timeout: 15_000 },
  );
  await expect
    .poll(async () => page.getByTestId("backlinks-panel").count())
    .toBeGreaterThan(0);
  await scrollEditorToBacklinks(page);
  await expect(page.getByTestId("backlinks-panel")).toBeVisible({
    timeout: 15_000,
  });
}

/** Poll until incoming section shows exactly `count` rows — avoids stale graph flakes. */
export async function waitForIncomingBacklinkRowCount(
  page: Page,
  count: number,
): Promise<void> {
  await expect
    .poll(async () => {
      const incoming = page.getByTestId("backlinks-incoming-section");
      if ((await incoming.count()) === 0) {
        return -1;
      }
      return incoming.locator('[data-testid^="backlinks-item-"]').count();
    })
    .toBe(count);
}

export async function expandBacklinksPanelIfCollapsed(
  page: Page,
): Promise<void> {
  const incoming = page.getByTestId("backlinks-incoming-section");
  if ((await incoming.count()) === 0) {
    await page.getByTestId("backlinks-panel-toggle").click();
  }
  await waitForIncomingBacklinkRowCount(page, 2);
}

export async function collectIncomingBacklinkRowTestIds(
  page: Page,
): Promise<string[]> {
  const incoming = page.getByTestId("backlinks-incoming-section");
  const rows = incoming.locator('[data-testid^="backlinks-item-"]');
  await expect(rows).toHaveCount(2);
  const testIds = await rows.evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-testid")),
  );
  return testIds.filter((id): id is string => id != null);
}

/**
 * Multi-hop backlink nav — re-collects row test ids after each return because
 * link ids can change when the graph reloads (AC59-backlinks-e2e-distinct-nav).
 */
export async function clickEachIncomingBacklinkByFreshTestId(
  page: Page,
  expectedNoteTitle: string,
  hops: number = 2,
): Promise<void> {
  const visitedSnippets = new Set<string>();

  for (let hop = 0; hop < hops; hop++) {
    await openProjectDocsWithBacklinksPanel(page);
    await expandBacklinksPanelIfCollapsed(page);

    const rowTestIds = await collectIncomingBacklinkRowTestIds(page);
    let clicked = false;

    for (const rowTestId of rowTestIds) {
      const linkId = rowTestId.replace(/^backlinks-item-/, "");
      const snippet = await page
        .getByTestId(`backlinks-snippet-${linkId}`)
        .innerText();
      if (visitedSnippets.has(snippet)) continue;

      visitedSnippets.add(snippet);
      await page.getByTestId(rowTestId).click();
      await expect(page.getByTestId("note-title")).toHaveValue(
        expectedNoteTitle,
        { timeout: 15_000 },
      );
      clicked = true;
      break;
    }

    expect(clicked).toBe(true);
  }
}
