import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPlaygroundContent,
  classifyPlaygroundDrift,
  playgroundDocHasBacktestMarkerHeading,
  shouldShowPlaygroundRestoreButton,
  shouldShowPlaygroundRestoreInDriftBanner,
} from "@/storage/formatPlaygroundNote";
import { extractTocFromDoc } from "@/utils/noteToc";
import {
  findPanelTocEntryAtPointerY,
  resolvePanelTocScrollContainer,
} from "@/utils/tocNavigation";

const infoPanelSource = readFileSync(
  join(process.cwd(), "src/components/editor/InfoPanel.tsx"),
  "utf-8",
);

/** Approximate TOC list client height inside 60vh panel at 606×844 (iter 49 gate). */
const PANEL_TOC_CLIENT_HEIGHT_PX = 412;
const TOC_ROW_HEIGHT_PX = 37;
const TOC_LIST_BOTTOM_PADDING_PX = 48;

function mockTocListLayout(entryCount: number) {
  const contentHeight =
    entryCount * TOC_ROW_HEIGHT_PX + TOC_LIST_BOTTOM_PADDING_PX;
  const list = {
    scrollHeight: contentHeight,
    clientHeight: PANEL_TOC_CLIENT_HEIGHT_PX,
    closest: (selector: string) =>
      selector.includes("info-panel-content-scroll") ? pane : null,
    parentElement: null,
  } as unknown as HTMLElement;
  const pane = {
    scrollHeight: contentHeight,
    clientHeight: PANEL_TOC_CLIENT_HEIGHT_PX,
  } as unknown as HTMLElement;
  return { list, pane, contentHeight };
}

describe("iteration 49 — AC46 toc bottom padding (behavioral)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("playground TOC overflows the panel scrollport with bottom padding below last row", () => {
    const toc = extractTocFromDoc(buildPlaygroundContent("zh"));
    const { contentHeight } = mockTocListLayout(toc.length);

    expect(toc[10]?.text).toBe("标签与链接");
    expect(toc[11]?.text).toBe("自由试炼");
    expect(contentHeight).toBeGreaterThan(PANEL_TOC_CLIENT_HEIGHT_PX);
    expect(contentHeight - PANEL_TOC_CLIENT_HEIGHT_PX).toBeGreaterThanOrEqual(
      TOC_LIST_BOTTOM_PADDING_PX,
    );
  });

  it("resolves the TOC list as scrollport when parent pane uses overflow hidden", () => {
    vi.stubGlobal(
      "getComputedStyle",
      vi.fn((el: HTMLElement) => {
        const sh = (el as { scrollHeight?: number }).scrollHeight ?? 0;
        return {
          overflowY: sh >= 400 ? "auto" : "hidden",
        } as CSSStyleDeclaration;
      }),
    );
    const { list, pane } = mockTocListLayout(12);
    expect(resolvePanelTocScrollContainer(list, pane)).toBe(list);
    expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
  });

  it("keeps 48px bottom inset on the TOC list scrollport", () => {
    expect(infoPanelSource).toMatch(/TOC_LIST_BOTTOM_PADDING_PX = 48/);
    expect(infoPanelSource).toMatch(
      /paddingBottom:\s*`max\(\$\{TOC_LIST_BOTTOM_PADDING_PX\}px, env\(safe-area-inset-bottom\)\)`/,
    );
  });
});

describe("iteration 49 — AC44 toc first-click (behavioral)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves info-panel-toc-entry-11 from bottom-edge tap at scrollTop 0", () => {
    vi.stubGlobal(
      "getComputedStyle",
      vi.fn(() => ({ overflowY: "auto" }) as CSSStyleDeclaration),
    );
    const scrollEl = {
      scrollTop: 0,
      getBoundingClientRect: () => ({
        top: 432,
        bottom: 844,
        left: 0,
        right: 606,
        width: 606,
        height: 412,
        x: 0,
        y: 432,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;
    const tagsEntry = {
      getAttribute: () => "info-panel-toc-entry-10",
      getBoundingClientRect: () => ({
        top: 804,
        bottom: 841,
        left: 0,
        right: 606,
        width: 606,
        height: 37,
        x: 0,
        y: 804,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;
    const tryEntry = {
      getAttribute: () => "info-panel-toc-entry-11",
      getBoundingClientRect: () => ({
        top: 841,
        bottom: 878,
        left: 0,
        right: 606,
        width: 606,
        height: 37,
        x: 0,
        y: 841,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;
    const list = {
      querySelectorAll: () => [tagsEntry, tryEntry],
      scrollHeight: 926,
      clientHeight: 412,
      closest: () => scrollEl,
      getBoundingClientRect: () => ({
        top: 432,
        bottom: 844,
        left: 0,
        right: 606,
        width: 606,
        height: 412,
        x: 0,
        y: 432,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;

    expect(findPanelTocEntryAtPointerY(list, 843, scrollEl)).toBe(tryEntry);
    expect(scrollEl.scrollTop).toBe(0);
  });

  it("scrolls editor before panel list on activation", () => {
    const activateBlock = infoPanelSource.slice(
      infoPanelSource.indexOf("const activateTocEntry"),
      infoPanelSource.indexOf("const handleTocPointerDownCapture"),
    );
    const editorIdx = activateBlock.indexOf("handleInfoPanelTocTap");
    const panelIdx = activateBlock.indexOf("scrollPanelTocEntryIntoView");
    expect(editorIdx).toBeGreaterThanOrEqual(0);
    expect(panelIdx).toBeGreaterThan(editorIdx);
  });
});

describe("iteration 49 — AC46/AC43 toc click activation (behavioral)", () => {
  it("includes 标签与链接 and 项目文档 wiki target in playground seed", () => {
    const toc = extractTocFromDoc(buildPlaygroundContent("zh"));
    const tagsIdx = toc.findIndex((e) => e.text === "标签与链接");
    expect(tagsIdx).toBe(10);
    const raw = JSON.stringify(buildPlaygroundContent("zh"));
    expect(raw).toContain("[[项目文档]]");
  });

  it("activates via onClick without blocking pointerdown default", () => {
    expect(infoPanelSource).toContain("handleTocPointerDownCapture");
    const captureBlock = infoPanelSource.slice(
      infoPanelSource.indexOf("handleTocPointerDownCapture"),
      infoPanelSource.indexOf("const tabs:"),
    );
    expect(captureBlock).not.toContain("preventDefault");
    expect(infoPanelSource).toContain('touchAction: "manipulation"');
  });
});

describe("iteration 49 — BACKTEST drift banner friction (regression)", () => {
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
      content: [{ type: "text", text: "BACKTEST49" }],
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
      content: [{ type: "text", text: "BACKTEST49" }],
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
