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

describe("iteration 48 — TOC list scrollport", () => {
  it("includes playground bottom headings in TOC", () => {
    const toc = extractTocFromDoc(buildPlaygroundContent("zh"));
    expect(toc.some((entry) => entry.text === "标签与链接")).toBe(true);
    expect(toc.some((entry) => entry.text === "自由试炼")).toBe(true);
  });

  it("scrolls the TOC list inside a flex-clamped panel pane", () => {
    expect(infoPanelSource).toContain("info-panel-toc-list");
    expect(infoPanelSource).toContain(
      'overflowY: activeTab === "stats" ? "auto" : "hidden"',
    );
    expect(infoPanelSource).toMatch(
      /info-panel-toc-list[\s\S]*flex:\s*"1 1 0"[\s\S]*minHeight:\s*0[\s\S]*overflowY:\s*"auto"/,
    );
    expect(infoPanelSource).toMatch(
      /info-panel-toc-list[\s\S]*scrollPaddingBottom:/,
    );
    expect(tocSource).toContain("resolvePanelTocScrollContainer");
  });
});

describe("iteration 48 — TOC first-click editor jump", () => {
  it("scrolls the editor before panel list scroll on activation", () => {
    const activateBlock = infoPanelSource.slice(
      infoPanelSource.indexOf("const activateTocEntry"),
      infoPanelSource.indexOf("const handleTocListPointerDownCapture"),
    );
    expect(activateBlock).toMatch(
      /handleInfoPanelTocTap\([\s\S]*scrollPanelTocEntryIntoView/,
    );
  });

  it("resolves bottom-edge taps against the TOC list scrollport", () => {
    expect(infoPanelSource).toContain("resolvePanelTocScrollContainer");
    expect(tocSource).toContain("extendsBelowScroll");
    expect(tocSource).toMatch(/PANEL_TOC_EDGE_SLOP_PX = 12/);
  });

  it("activates entries via list capture handlers without React preventDefault", () => {
    expect(infoPanelSource).toContain("handleTocListPointerDownCapture");
    const captureBlock = infoPanelSource.slice(
      infoPanelSource.indexOf("handleTocListPointerDownCapture"),
      infoPanelSource.indexOf("const tabs:"),
    );
    expect(captureBlock).not.toContain("preventDefault");
    expect(infoPanelSource).toMatch(/event\.preventDefault\(\)/);
  });
});

describe("iteration 48 — TOC jump regression", () => {
  it("scrolls via editor scroll container with panel viewport bounds", () => {
    expect(tocSource).toContain("findEditorScrollContainer");
    expect(tocSource).toContain("resolveTocScrollViewportBounds");
    expect(tocSource).toContain("scrollToTocDocPos");
    expect(tocSource).toContain("scrollIntoView: false");
  });

  it("closes overlays when opening info panel", () => {
    expect(editorSource).toMatch(
      /openStatsOverlay[\s\S]*setNoteSearchVisible\(false\)/,
    );
  });
});

describe("iteration 48 — BACKTEST drift banner friction (regression)", () => {
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
      content: [{ type: "text", text: "BACKTEST48" }],
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
      content: [{ type: "text", text: "BACKTEST48" }],
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
