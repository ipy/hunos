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

const editorSource = readFileSync(
  join(process.cwd(), "src/screens/EditorScreen.tsx"),
  "utf-8",
);
const infoPanelSource = readFileSync(
  join(process.cwd(), "src/components/editor/InfoPanel.tsx"),
  "utf-8",
);
const tocSource = readFileSync(
  join(process.cwd(), "src/utils/tocNavigation.ts"),
  "utf-8",
);
const wikiLinkSource = readFileSync(
  join(process.cwd(), "src/components/editor/wikiLinkPointerUtils.ts"),
  "utf-8",
);

describe("iteration 47 — TOC bottom padding and scroll", () => {
  it("includes playground bottom headings in TOC", () => {
    const toc = extractTocFromDoc(buildPlaygroundContent("zh"));
    expect(toc.some((entry) => entry.text === "标签与链接")).toBe(true);
    expect(toc.some((entry) => entry.text === "自由试炼")).toBe(true);
  });

  it("uses flex-basis zero scroll container with bottom inset", () => {
    expect(infoPanelSource).toMatch(/TOC_LIST_BOTTOM_PADDING_PX = 48/);
    expect(infoPanelSource).toContain("info-panel-content-scroll");
    expect(infoPanelSource).toContain("scrollPaddingBottom:");
    expect(infoPanelSource).toMatch(/height:\s*"60vh"/);
    expect(infoPanelSource).toMatch(/flex:\s*"1 1 0"/);
    expect(infoPanelSource).toMatch(
      /flex:\s*"1 1 0"[\s\S]*minHeight:\s*0[\s\S]*overflowY:\s*"auto"/,
    );
    expect(infoPanelSource).toContain('boxSizing: "border-box"');
  });
});

describe("iteration 47 — TOC click activation", () => {
  it("activates entries via onClick and capture pointerdown without preventDefault", () => {
    expect(infoPanelSource).toContain("handleTocPointerDownCapture");
    expect(infoPanelSource).toContain("activateTocEntry");

    const captureBlock = infoPanelSource.slice(
      infoPanelSource.indexOf("handleTocPointerDownCapture"),
      infoPanelSource.indexOf("const tabs:"),
    );
    expect(captureBlock).not.toContain("preventDefault");

    const tocEntryBlock = infoPanelSource.slice(
      infoPanelSource.indexOf("info-panel-toc-entry-"),
      infoPanelSource.indexOf('touchAction: "manipulation"'),
    );
    expect(tocEntryBlock).toMatch(/onClick=\{/);
    expect(tocEntryBlock).not.toMatch(/onPointerDown=\{/);
  });

  it("resolves editor scroll container even before content overflows", () => {
    expect(wikiLinkSource).toContain("overflowCandidate");
    expect(tocSource).toContain("findEditorScrollContainer");
  });

  it("expands bottom-edge slop for first-click hits", () => {
    expect(tocSource).toMatch(/PANEL_TOC_EDGE_SLOP_PX = 12/);
    expect(tocSource).toContain("inScrollBottomEdge");
    expect(tocSource).toContain("extendsBelowScroll");
  });
});

describe("iteration 47 — info panel tab memory", () => {
  it("persists tab via ref on close to avoid stale activeTab overwrites", () => {
    expect(infoPanelSource).toContain("activeTabRef");
    expect(infoPanelSource).toContain("activeTabRef.current = activeTab");
    expect(infoPanelSource).toMatch(
      /rememberInfoPanelTabForReopen\(note\.id, activeTabRef\.current\)/,
    );
  });

  it("clears reopen memory when switching notes", () => {
    expect(editorSource).toContain("clearInfoPanelTabReopenMemory");
    expect(editorSource).toMatch(
      /leavingNoteId && leavingNoteId !== nextNoteId[\s\S]*clearInfoPanelTabReopenMemory/,
    );
  });
});

describe("iteration 47 — BACKTEST drift banner friction (regression)", () => {
  const seedContent = JSON.stringify(buildPlaygroundContent("zh"));

  it("detects BACKTEST marker headings for restore menu gating", () => {
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
      content: [{ type: "text", text: "BACKTEST47" }],
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
  });

  it("suppresses inline drift banner for BACKTEST-only QA inserts", () => {
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
      content: [{ type: "text", text: "BACKTEST47" }],
    });
    const pendingDraft = JSON.stringify(parsed);

    expect(
      shouldShowPlaygroundRestoreInDriftBanner({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seedContent,
        pendingDraftContent: pendingDraft,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });
});
