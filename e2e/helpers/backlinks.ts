import { expect, type Page } from "@playwright/test";
import { backlinkSnippetHasRawMarkdown } from "../../src/components/backlinks/formatBacklinkSnippet";
import { noteHashForId } from "../../src/utils/noteRoute";
import { PROJECT_DOCS_NOTE_TITLE } from "./playground";
import { openNoteFromList } from "./notes";

export function assertBacklinkSnippetPlainText(text: string): void {
  expect(text.length).toBeGreaterThan(0);
  expect(backlinkSnippetHasRawMarkdown(text)).toBe(false);
}

/** Read target note id from a backlink row's payload (AC62-backlinks-nav-hash-resolve). */
export async function incomingBacklinkTargetNoteId(
  page: Page,
  rowTestId: string,
): Promise<string> {
  const row = page.getByTestId(rowTestId);
  const noteId = await row.getAttribute("data-note-id");
  if (!noteId) {
    throw new Error(`backlink row missing data-note-id: ${rowTestId}`);
  }
  return noteId;
}

/** Assert location.hash references the target note id (AC61-backlinks-nav-hash). */
export async function expectBacklinkNavigationHash(
  page: Page,
  expectedNoteId: string,
): Promise<void> {
  const expectedHash = noteHashForId(expectedNoteId);
  await expect
    .poll(() => page.evaluate(() => window.location.hash))
    .toBe(expectedHash);
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

function incomingBacklinkLinkId(rowTestId: string): string {
  return rowTestId.replace(/^backlinks-item-/, "");
}

/** Collect visible prefix labels from backlinks-prefix-* test ids (AC64). */
export async function collectIncomingBacklinkPrefixTexts(
  page: Page,
): Promise<string[]> {
  const rowTestIds = await collectIncomingBacklinkRowTestIds(page);
  const prefixes: string[] = [];
  for (const rowTestId of rowTestIds) {
    const linkId = incomingBacklinkLinkId(rowTestId);
    const prefix = page.getByTestId(`backlinks-prefix-${linkId}`);
    await expect(prefix).toBeVisible();
    prefixes.push(await prefix.innerText());
  }
  return prefixes;
}

/**
 * Multi-hop backlink nav — re-collects row test ids after each return when needed;
 * stable source+position keys keep ids identical across graph reloads (AC60).
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
