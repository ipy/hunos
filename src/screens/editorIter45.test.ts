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
import { defaultInfoPanelTab, extractTocFromDoc } from "@/utils/noteToc";

const infoPanelSource = readFileSync(
  join(process.cwd(), "src/components/editor/InfoPanel.tsx"),
  "utf-8",
);

describe("iteration 45 — TOC discoverability", () => {
  it("includes 标签与链接 in playground TOC", () => {
    const toc = extractTocFromDoc(buildPlaygroundContent("zh"));
    expect(toc.some((entry) => entry.text === "标签与链接")).toBe(true);
  });

  it("defaults info panel to TOC for heading-rich playground notes", () => {
    const content = JSON.stringify(buildPlaygroundContent("zh"));
    expect(
      defaultInfoPanelTab(
        {
          id: "playground",
          title: "格式试炼场",
          content,
          contentPlain: "",
          isPinned: false,
          status: "active",
          trashedAt: null,
          createdAt: 0,
          modifiedAt: 0,
          wordCount: 0,
        },
        null,
      ),
    ).toBe("toc");
  });

  it("renders toc entries in the default panel view without a tab switch", () => {
    expect(infoPanelSource).toContain("defaultInfoPanelTab");
    expect(infoPanelSource).not.toContain('useState<InfoPanelTab>("stats")');
    expect(infoPanelSource).toContain(
      "data-testid={`info-panel-toc-entry-${i}`}",
    );
  });
});

describe("iteration 45 — TOC first-click single handler", () => {
  it("activates TOC entries via capture pointerdown and entry click", () => {
    expect(infoPanelSource).toContain(
      "onPointerDownCapture={handleTocListPointerDownCapture}",
    );
    expect(infoPanelSource).toContain("handleTocListPointerDownCapture");
    expect(infoPanelSource).toContain("panelTocEntryFromPointerY");
    expect(infoPanelSource).toContain("activateTocEntry");

    const tocEntryBlock = infoPanelSource.slice(
      infoPanelSource.indexOf("info-panel-toc-entry-"),
      infoPanelSource.indexOf('touchAction: "manipulation"'),
    );
    expect(tocEntryBlock).not.toMatch(/onPointerDown=\{/);
    expect(tocEntryBlock).toMatch(/onClick=\{/);
    expect(tocEntryBlock).toContain("onKeyDown");
  });
});

describe("iteration 45 — BACKTEST drift banner friction (regression)", () => {
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
      content: [{ type: "text", text: "BACKTEST45" }],
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
      content: [{ type: "text", text: "BACKTEST45" }],
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
