import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPlaygroundContent,
  classifyPlaygroundDrift,
  shouldShowPlaygroundRestoreButton,
} from "@/storage/formatPlaygroundNote";
import { extractTocFromDoc } from "@/utils/noteToc";
import {
  panelTocEntryFromPointerY,
  resolvePanelTocScrollContainer,
} from "@/utils/tocNavigation";

const infoPanelSource = readFileSync(
  join(process.cwd(), "src/components/editor/InfoPanel.tsx"),
  "utf-8",
);

const PANEL_TOC_CLIENT_HEIGHT_PX = 412;
const TOC_ROW_HEIGHT_PX = 37;
const TOC_LIST_BOTTOM_PADDING_PX = 48;

describe("iteration 50 — TOC list capture and e2e open path", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens playground TOC without restore chip on canonical fresh seed", () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        pendingDraftContent: null,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
    expect(
      classifyPlaygroundDrift({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        liveContent: null,
        fallbackLocale: "zh",
      }),
    ).toBe("none");
  });

  it("registers pointer, click, and touch capture on the TOC list scrollport", () => {
    expect(infoPanelSource).toContain("handleTocListPointerDownCapture");
    expect(infoPanelSource).toContain("handleTocListClickCapture");
    expect(infoPanelSource).toContain("handleTocListTouchEndCapture");
    expect(infoPanelSource).toMatch(
      /data-testid="info-panel-toc-list"[\s\S]*onPointerDownCapture=\{handleTocListPointerDownCapture\}/,
    );
    expect(infoPanelSource).not.toContain("handleTocPointerDownCapture");
    const contentScrollBlock = infoPanelSource.slice(
      infoPanelSource.indexOf('data-testid="info-panel-content-scroll"'),
      infoPanelSource.indexOf('data-testid="info-panel-toc-list"'),
    );
    expect(contentScrollBlock).not.toContain("onPointerDownCapture");
  });

  it("uses panelTocEntryFromPointerY for bottom-edge activation at scrollTop 0", () => {
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
      querySelectorAll: () => [tryEntry],
      scrollHeight: 926,
      clientHeight: PANEL_TOC_CLIENT_HEIGHT_PX,
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

    const resolved = panelTocEntryFromPointerY(list, 843, scrollEl);
    expect(resolved?.entry).toBe(tryEntry);
    expect(resolved?.index).toBe(11);
    expect(scrollEl.scrollTop).toBe(0);
  });
});

describe("iteration 50 — AC46 toc bottom padding (regression)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("playground TOC still overflows with 48px tail inset", () => {
    const toc = extractTocFromDoc(buildPlaygroundContent("zh"));
    const contentHeight =
      toc.length * TOC_ROW_HEIGHT_PX + TOC_LIST_BOTTOM_PADDING_PX;
    expect(toc[11]?.text).toBe("自由试炼");
    expect(contentHeight).toBeGreaterThan(PANEL_TOC_CLIENT_HEIGHT_PX);
    expect(infoPanelSource).toMatch(/TOC_LIST_BOTTOM_PADDING_PX = 48/);
  });

  it("resolves the TOC list as scrollport when the pane is overflow hidden", () => {
    vi.stubGlobal(
      "getComputedStyle",
      vi.fn((el: HTMLElement) => {
        const sh = (el as { scrollHeight?: number }).scrollHeight ?? 0;
        return {
          overflowY: sh >= 400 ? "auto" : "hidden",
        } as CSSStyleDeclaration;
      }),
    );
    const list = {
      scrollHeight: 926,
      clientHeight: PANEL_TOC_CLIENT_HEIGHT_PX,
      closest: (selector: string) =>
        selector.includes("info-panel-content-scroll")
          ? ({
              scrollHeight: 926,
              clientHeight: PANEL_TOC_CLIENT_HEIGHT_PX,
            } as HTMLElement)
          : null,
      parentElement: null,
    } as unknown as HTMLElement;
    const pane = list.closest(
      '[data-testid="info-panel-content-scroll"]',
    ) as HTMLElement;
    expect(resolvePanelTocScrollContainer(list, pane)).toBe(list);
  });
});
