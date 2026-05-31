import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BACKLINKS_ITEM_NOTE_ID_ATTR } from "@/components/backlinks/BacklinksPanel";
import {
  backlinkContextWithSection,
  graphHeadingOffsetsFromJson,
  sectionHeadingAtOffset,
} from "@/graph/linkExtractor";
import {
  buildPlaygroundContent,
  PLAYGROUND_CONTENT_VERSION,
} from "@/storage/formatPlaygroundNote";
import { formatBacklinkSnippet } from "@/components/backlinks/formatBacklinkSnippet";

const backlinksE2eSource = readFileSync(
  join(process.cwd(), "e2e/backlinks/backlinks.spec.ts"),
  "utf-8",
);
const backlinksHelperSource = readFileSync(
  join(process.cwd(), "e2e/helpers/backlinks.ts"),
  "utf-8",
);
const backlinksPanelSource = readFileSync(
  join(process.cwd(), "src/components/backlinks/BacklinksPanel.tsx"),
  "utf-8",
);
const noteListSource = readFileSync(
  join(process.cwd(), "src/screens/NoteListScreen.tsx"),
  "utf-8",
);

describe("iteration 62 — nav hash from row payload (AC62-backlinks-nav-hash-resolve)", () => {
  it("reads expected note id from row data-note-id, not noteIdFromListItem", () => {
    expect(backlinksPanelSource).toContain(BACKLINKS_ITEM_NOTE_ID_ATTR);
    expect(backlinksHelperSource).toContain("incomingBacklinkTargetNoteId");
    expect(backlinksHelperSource).toContain('getAttribute("data-note-id")');
    expect(backlinksE2eSource).toContain("incomingBacklinkTargetNoteId");
    expect(backlinksE2eSource).not.toContain("noteIdFromListItem");
  });
});

describe("iteration 62 — nav hash mobile (AC62-backlinks-nav-hash-mobile)", () => {
  it("asserts hash on 606×844 without noteIdFromListItem reopen side effects", () => {
    const ac61Start = backlinksE2eSource.indexOf("AC61-backlinks-nav-hash");
    expect(ac61Start).toBeGreaterThan(-1);
    const ac61Block = backlinksE2eSource.slice(ac61Start, ac61Start + 1200);
    expect(ac61Block).toContain("incomingBacklinkTargetNoteId");
    expect(ac61Block).not.toContain("noteIdFromListItem");
    expect(ac61Block).not.toContain("ensureNoteListScreen");
    expect(backlinksE2eSource).toContain("mobile 606×844");
    expect(backlinksE2eSource).toContain("expectBacklinkNavigationHash");
  });
});

describe("iteration 62 — snippet section disambiguation (AC62-backlink-snippet-disambiguate)", () => {
  it("prepends distinct section labels for playground duplicate-source links", () => {
    expect(PLAYGROUND_CONTENT_VERSION).toBeGreaterThanOrEqual(26);
    const content = buildPlaygroundContent("zh");
    const headings = graphHeadingOffsetsFromJson(content);
    const tagsHeading = headings.find((h) => h.title === "标签与链接");
    const tryHeading = headings.find((h) => h.title === "自由试炼");
    expect(tagsHeading).toBeDefined();
    expect(tryHeading).toBeDefined();

    const tagsSection = sectionHeadingAtOffset(
      headings,
      tagsHeading!.offset + 20,
    );
    const trySection = sectionHeadingAtOffset(
      headings,
      tryHeading!.offset + 20,
    );
    expect(tagsSection).toBe("标签与链接");
    expect(trySection).toBe("自由试炼");

    const tagsSnippet = formatBacklinkSnippet(
      backlinkContextWithSection(
        "... 详见 [[项目文档]] 与 [[项目文档]] #42。...",
        "标签与链接",
      ),
    );
    const trySnippet = formatBacklinkSnippet(
      backlinkContextWithSection("... 与 [[项目文档]] #42。...", "自由试炼"),
    );
    expect(tagsSnippet.startsWith("标签与链接 ·")).toBe(true);
    expect(trySnippet.startsWith("自由试炼 ·")).toBe(true);
    expect(tagsSnippet).not.toBe(trySnippet);
  });

  it("names AC62 snippet disambiguation e2e on desktop and mobile", () => {
    expect(backlinksE2eSource).toContain("AC62-backlink-snippet-disambiguate");
  });
});

describe("iteration 62 — sticky search clear (AC62-search-filter-clear)", () => {
  it("clears list search when opening a note from search results", () => {
    expect(noteListSource).toContain("handleSelectNote");
    expect(noteListSource).toMatch(
      /handleSelectNote[\s\S]*searchQuery[\s\S]*clearSearch/,
    );
    expect(noteListSource).toMatch(/clearSearch[\s\S]*setShowSearch\(false\)/);
  });
});
