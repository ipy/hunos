import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPlaygroundContent,
  classifyPlaygroundDrift,
  playgroundDocHasBacktestMarkerHeading,
  shouldShowPlaygroundRestoreButton,
  shouldShowPlaygroundRestoreInDriftBanner,
} from "@/storage/formatPlaygroundNote";
import { extractTocFromDoc } from "@/utils/noteToc";

const wikiLinkSource = readFileSync(
  join(process.cwd(), "src/components/editor/WikiLinkDecoration.ts"),
  "utf-8",
);
const pointerUtilsSource = readFileSync(
  join(process.cwd(), "src/components/editor/wikiLinkPointerUtils.ts"),
  "utf-8",
);
const editorSource = readFileSync(
  join(process.cwd(), "src/screens/EditorScreen.tsx"),
  "utf-8",
);
const tocSource = readFileSync(
  join(process.cwd(), "src/utils/tocNavigation.ts"),
  "utf-8",
);

describe("iteration 43 — offscreen pointer hit-testing", () => {
  it("maps pointer coords through scroll container for below-fold wiki-links", () => {
    expect(wikiLinkSource).toContain("resolveWikiLinkFromPointerEvent");
    expect(wikiLinkSource).toContain("wikiLinkMatchAtScrollMappedPointer");
    expect(wikiLinkSource).toContain("findEditorScrollContainer");
    expect(wikiLinkSource).toContain('document.addEventListener("click"');
    expect(pointerUtilsSource).toContain("wikiLinkMatchAtPointer");
    expect(pointerUtilsSource).toContain("wikiLinkMatchAtScrollMappedPointer");
  });
});

describe("iteration 43 — TOC jump discoverability", () => {
  it("includes 标签与链接 in playground TOC", () => {
    const toc = extractTocFromDoc(buildPlaygroundContent("zh"));
    expect(toc.some((entry) => entry.text === "标签与链接")).toBe(true);
  });

  it("scrolls heading DOM into view after TOC tap", () => {
    expect(tocSource).toContain("scrollHeadingDomIntoView");
    expect(tocSource).toContain('block: "start"');
    expect(tocSource).toContain('behavior: "smooth"');
  });
});

describe("iteration 43 — restore chip de-emphasis for BACKTEST drift", () => {
  const seedContent = JSON.stringify(buildPlaygroundContent("zh"));

  it("detects BACKTEST43 marker headings", () => {
    const parsed = JSON.parse(seedContent) as {
      content: Array<{
        type: string;
        attrs?: { level: number };
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };
    parsed.content.splice(5, 0, {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "BACKTEST43" }],
    });
    const pendingDraft = JSON.stringify(parsed);

    expect(playgroundDocHasBacktestMarkerHeading(pendingDraft)).toBe(true);
    expect(
      classifyPlaygroundDrift({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        liveContent: pendingDraft,
        fallbackLocale: "zh",
      }),
    ).toBe("structural");
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: pendingDraft,
        fallbackLocale: "zh",
      }),
    ).toBe(true);
    expect(
      shouldShowPlaygroundRestoreInDriftBanner({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: pendingDraft,
        fallbackLocale: "zh",
      }),
    ).toBe(true);
  });

  it("renders muted drift banner instead of title-row chip for BACKTEST drift", () => {
    expect(editorSource).toContain("restore-playground-drift-banner");
    expect(editorSource).toContain("showRestorePlaygroundDriftBanner");
    expect(editorSource).toContain("showRestorePlaygroundChip");
    expect(editorSource).toContain("playgroundDriftBannerHint");
  });
});
