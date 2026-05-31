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

describe("iteration 44 — TOC scroll alignment", () => {
  it("includes 标签与链接 in playground TOC", () => {
    const toc = extractTocFromDoc(buildPlaygroundContent("zh"));
    expect(toc.some((entry) => entry.text === "标签与链接")).toBe(true);
  });

  it("scrolls via editor scroll container with top padding", () => {
    expect(tocSource).toContain("findEditorScrollContainer");
    expect(tocSource).toContain("editorScrollDeltaForTocReveal");
    expect(tocSource).toContain("scrollIntoView: false");
    expect(tocSource).not.toContain('block: "start"');
  });
});

describe("iteration 44 — TOC first-click reliability", () => {
  it("handles TOC tap on pointerdown without waiting for click", () => {
    expect(infoPanelSource).toContain("onPointerDown");
    expect(infoPanelSource).toContain("handleInfoPanelTocTap(editor, i)");
    expect(infoPanelSource).toContain('touchAction: "manipulation"');
    expect(infoPanelSource).toContain("safe-area-inset-bottom");
  });
});

describe("iteration 44 — overlay panel exclusion", () => {
  it("closes info panel when note search opens", () => {
    expect(editorSource).toContain("setNoteSearchVisible(false)");
    expect(editorSource).toContain("setShowStats(false)");
    expect(editorSource).toMatch(
      /noteSearchOpen[\s\S]*setShowStats\(false\)/,
    );
  });

  it("closes note search when info panel opens", () => {
    expect(editorSource).toMatch(
      /openStatsOverlay[\s\S]*setNoteSearchVisible\(false\)/,
    );
    expect(editorSource).toMatch(/openStatsOverlay[\s\S]*setFindOpen\(false\)/);
  });
});

describe("iteration 44 — BACKTEST drift banner friction", () => {
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
      content: [{ type: "text", text: "BACKTEST44" }],
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
      content: [{ type: "text", text: "BACKTEST44" }],
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
