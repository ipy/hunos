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

describe("iteration 46 — TOC bottom padding", () => {
  it("includes playground bottom headings in TOC", () => {
    const toc = extractTocFromDoc(buildPlaygroundContent("zh"));
    expect(toc.some((entry) => entry.text === "标签与链接")).toBe(true);
    expect(toc.some((entry) => entry.text === "自由试炼")).toBe(true);
  });

  it("adds scroll breathing room below the last TOC row", () => {
    expect(infoPanelSource).toContain("TOC_LIST_BOTTOM_PADDING_PX");
    expect(infoPanelSource).toMatch(/TOC_LIST_BOTTOM_PADDING_PX = 48/);
    expect(infoPanelSource).toContain("paddingBottom:");
    expect(infoPanelSource).toContain("safe-area-inset-bottom");
    expect(infoPanelSource).toMatch(
      /flex:\s*1[\s\S]*minHeight:\s*0[\s\S]*overflowY:\s*"auto"/,
    );
  });
});

describe("iteration 46 — TOC click activation", () => {
  it("activates entries via pointerdown capture and synthetic click", () => {
    expect(infoPanelSource).toContain("handleTocListPointerDownCapture");
    expect(infoPanelSource).toContain("activateTocEntry");

    const tocEntryBlock = infoPanelSource.slice(
      infoPanelSource.indexOf("info-panel-toc-entry-"),
      infoPanelSource.indexOf('touchAction: "manipulation"'),
    );
    expect(tocEntryBlock).toMatch(/onClick=\{/);
    expect(tocEntryBlock).not.toMatch(/onPointerDown=\{/);
  });
});

describe("iteration 46 — e2e editor bridge", () => {
  it("registers the live editor with hunos-e2e-bridge when __HUNOS_E2E__", () => {
    expect(editorSource).toContain('from "@/testing/hunos-e2e-bridge"');
    expect(editorSource).toContain("registerHunosE2eEditor");
    expect(editorSource).toMatch(
      /__HUNOS_E2E__[\s\S]*registerHunosE2eEditor\(editor\)/,
    );
  });
});

describe("iteration 46 — info panel tab memory", () => {
  it("remembers tab on close and restores on reopen", () => {
    expect(infoPanelSource).toContain("initialInfoPanelTab");
    expect(infoPanelSource).toContain("rememberInfoPanelTabForReopen");
    expect(infoPanelSource).toContain("handleClose");
    expect(infoPanelSource).toContain("selectTab");
  });

  it("clears reopen memory when switching notes", () => {
    expect(editorSource).toContain("clearInfoPanelTabReopenMemory");
    expect(editorSource).toMatch(
      /leavingNoteId && leavingNoteId !== nextNoteId[\s\S]*clearInfoPanelTabReopenMemory/,
    );
  });
});

describe("iteration 46 — BACKTEST drift banner friction (regression)", () => {
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
      content: [{ type: "text", text: "BACKTEST46" }],
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
      content: [{ type: "text", text: "BACKTEST46" }],
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
