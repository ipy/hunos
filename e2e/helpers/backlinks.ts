import { expect, type Page } from "@playwright/test";
import { backlinkSnippetHasRawMarkdown } from "../../src/components/backlinks/formatBacklinkSnippet";
import { noteHashForId } from "../../src/utils/noteRoute";
import {
  editorLocator,
  FORMAT_PLAYGROUND_TITLE,
  PROJECT_DOCS_NOTE_TITLE,
} from "./playground";
import { noteIdFromListItem, openNoteFromList } from "./notes";

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
/** Resolve 格式试炼场 id locally per test — avoids describe-scoped mutable state (AC66). */
export async function resolveFormatPlaygroundNoteId(
  page: Page,
): Promise<string> {
  return noteIdFromListItem(page, FORMAT_PLAYGROUND_TITLE);
}

/** Assert a section heading is visible in the editor without manual scroll (AC65). */
export async function expectEditorSectionHeadingVisible(
  page: Page,
  heading: string,
): Promise<void> {
  await expect(
    editorLocator(page).getByRole("heading", { name: heading, exact: true }),
  ).toBeVisible({ timeout: 15_000 });
}

/** Primary scroll target intersects the top/center viewport band (AC67). */
export async function expectEditorSectionHeadingPrimaryScrollTarget(
  page: Page,
  primaryHeading: string,
  options?: { notCoPrimary?: string[] },
): Promise<void> {
  const notCoPrimary = options?.notCoPrimary ?? [];
  await expect
    .poll(
      async () => {
        const result = await page.evaluate(
          ({ primaryHeading, notCoPrimary }) => {
            const scrollPane = document.querySelector(
              '[data-testid="editor-scroll-pane"]',
            );
            if (!(scrollPane instanceof HTMLElement)) {
              return { error: "missing editor scroll pane" as const };
            }

            const scrollRect = scrollPane.getBoundingClientRect();
            let viewportBottom = scrollRect.bottom;
            const infoPanel = document.querySelector('[data-testid="info-panel"]');
            if (infoPanel instanceof HTMLElement) {
              const panelRect = infoPanel.getBoundingClientRect();
              if (panelRect.top < viewportBottom) {
                viewportBottom = Math.max(scrollRect.top + 1, panelRect.top);
              }
            }

            const bandTop = scrollRect.top + 12;
            const bandBottom =
              scrollRect.top + (viewportBottom - scrollRect.top) * 0.55;

            const headingBandScore = (name: string): number | null => {
              const headings = scrollPane.querySelectorAll("h1,h2,h3,h4,h5,h6");
              for (const heading of headings) {
                if (heading.textContent?.trim() !== name) continue;
                const rect = heading.getBoundingClientRect();
                const center = (rect.top + rect.bottom) / 2;
                if (center >= bandTop && center <= bandBottom) return center;
                if (rect.top >= bandTop && rect.top <= bandBottom) {
                  return rect.top;
                }
              }
              return null;
            };

            return {
              primaryScore: headingBandScore(primaryHeading),
              coPrimary: notCoPrimary.map((heading) => ({
                heading,
                score: headingBandScore(heading),
              })),
            };
          },
          { primaryHeading, notCoPrimary },
        );

        if ("error" in result) return result.error;
        if (result.primaryScore == null) return "missing-primary";
        for (const entry of result.coPrimary ?? []) {
          if (entry.score != null) {
            return `co-primary:${entry.heading}:${entry.score}`;
          }
        }
        return "ok";
      },
      { timeout: 15_000 },
    )
    .toBe("ok");
}

/** Snippet bodies stay within their section prefix (AC67). */
export async function expectBacklinkSnippetSectionBoundaries(
  page: Page,
): Promise<void> {
  const prefixes = await collectIncomingBacklinkPrefixTexts(page);
  const sectionHeadings = prefixes.map(
    (prefix) => prefix.split(" · ")[0]?.trim() ?? prefix,
  );

  for (const rowTestId of await collectIncomingBacklinkRowTestIds(page)) {
    const linkId = incomingBacklinkLinkId(rowTestId);
    const prefix = await page
      .getByTestId(`backlinks-prefix-${linkId}`)
      .innerText();
    const snippet = await page
      .getByTestId(`backlinks-snippet-${linkId}`)
      .innerText();
    const sectionHeading = prefix.split(" · ")[0]?.trim() ?? prefix;
    const separatorIdx = snippet.indexOf("·");
    const body =
      separatorIdx >= 0 ? snippet.slice(separatorIdx + 1).trim() : snippet;

    for (const other of sectionHeadings) {
      if (other === sectionHeading) continue;
      expect(body).not.toContain(other);
    }
  }
}

/** Click the incoming row whose prefix matches `sectionPrefix`. */
export async function clickIncomingBacklinkBySectionPrefix(
  page: Page,
  sectionPrefix: string,
): Promise<void> {
  const rowTestIds = await collectIncomingBacklinkRowTestIds(page);
  for (const rowTestId of rowTestIds) {
    const linkId = incomingBacklinkLinkId(rowTestId);
    const prefix = await page
      .getByTestId(`backlinks-prefix-${linkId}`)
      .innerText();
    if (prefix === sectionPrefix || prefix.startsWith(`${sectionPrefix} ·`)) {
      await page.getByTestId(rowTestId).click();
      return;
    }
  }
  throw new Error(
    `incoming backlink with section prefix "${sectionPrefix}" not found`,
  );
}

const BACKLINK_SECTION_SCROLL_HOPS = [
  { prefix: "标签与链接", heading: "标签与链接" },
  { prefix: "自由试炼", heading: "自由试炼" },
] as const;

/**
 * Multi-hop nav with per-hop section scroll proof — row test ids and prefixes
 * are collected dynamically each hop (AC65, AC67-scroll-e2e-dynamic-hops).
 */
export async function clickEachIncomingBacklinkWithSectionScroll(
  page: Page,
  expectedNoteTitle: string = FORMAT_PLAYGROUND_TITLE,
): Promise<void> {
  const visitedSections = new Set<string>();

  while (visitedSections.size < BACKLINK_SECTION_SCROLL_HOPS.length) {
    await openProjectDocsWithBacklinksPanel(page);
    await expandBacklinksPanelIfCollapsed(page);

    const rowTestIds = await collectIncomingBacklinkRowTestIds(page);
    const allSections = await Promise.all(
      rowTestIds.map(async (rowTestId) => {
        const linkId = incomingBacklinkLinkId(rowTestId);
        const prefix = await page
          .getByTestId(`backlinks-prefix-${linkId}`)
          .innerText();
        return prefix.split(" · ")[0]?.trim() ?? prefix;
      }),
    );

    let clicked = false;
    for (const rowTestId of rowTestIds) {
      const linkId = incomingBacklinkLinkId(rowTestId);
      const prefix = await page
        .getByTestId(`backlinks-prefix-${linkId}`)
        .innerText();
      const sectionHeading = prefix.split(" · ")[0]?.trim() ?? prefix;
      if (visitedSections.has(sectionHeading)) continue;

      visitedSections.add(sectionHeading);
      await page.getByTestId(rowTestId).click();
      await expect(page.getByTestId("note-title")).toHaveValue(
        expectedNoteTitle,
        { timeout: 15_000 },
      );
      await expectEditorSectionHeadingVisible(page, sectionHeading);
      await expectEditorSectionHeadingPrimaryScrollTarget(
        page,
        sectionHeading,
        {
          notCoPrimary: allSections.filter(
            (section) => section !== sectionHeading,
          ),
        },
      );
      clicked = true;
      break;
    }

    expect(clicked).toBe(true);
  }
}

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
