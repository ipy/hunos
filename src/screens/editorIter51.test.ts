import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findPanelTocEntryAtPointerY,
  findPanelTocEntryAtLayoutPoint,
  panelTocEntryIndex,
} from "@/utils/tocNavigation";

const infoPanelSource = readFileSync(
  join(process.cwd(), "src/components/editor/InfoPanel.tsx"),
  "utf-8",
);
const tocSource = readFileSync(
  join(process.cwd(), "src/utils/tocNavigation.ts"),
  "utf-8",
);

describe("iteration 51 — unified off-screen TOC activation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not preventDefault on pointerdown so testid clicks reach handlers", () => {
    const pinBlock = infoPanelSource.slice(
      infoPanelSource.indexOf("const pinListScrollTop"),
      infoPanelSource.indexOf("const pinAfterPointer"),
    );
    expect(pinBlock).not.toContain("preventDefault");
  });

  it("activates direct TOC entry target before pointer-Y resolution on click capture", () => {
    const clickBlock = infoPanelSource.slice(
      infoPanelSource.indexOf("handleTocListClickCapture"),
      infoPanelSource.indexOf("handleTocListTouchEndCapture"),
    );
    expect(clickBlock).toContain("panelTocEntryIndex");
    expect(clickBlock).toContain("activateTocEntry");
    expect(clickBlock.indexOf("activateTocEntry")).toBeLessThan(
      clickBlock.indexOf("activateTocAtClientY"),
    );
  });

  it("picks first below-fold row on bottom-edge tap, not last visible 表格 row", () => {
    vi.stubGlobal(
      "getComputedStyle",
      vi.fn(() => ({ overflowY: "auto" }) as CSSStyleDeclaration),
    );
    const scrollRect = {
      top: 432,
      bottom: 844,
      left: 0,
      right: 606,
      width: 606,
      height: 412,
      x: 0,
      y: 432,
      toJSON: () => ({}),
    };
    const scrollEl = {
      getBoundingClientRect: () => scrollRect,
    } as unknown as HTMLElement;
    const tableEntry = {
      getAttribute: () => "info-panel-toc-entry-9",
      getBoundingClientRect: () => ({
        top: 765,
        bottom: 802,
        left: 0,
        right: 606,
        width: 606,
        height: 37,
        x: 0,
        y: 765,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;
    const tryEntry = {
      getAttribute: () => "info-panel-toc-entry-11",
      getBoundingClientRect: () => ({
        top: 878,
        bottom: 915,
        left: 0,
        right: 606,
        width: 606,
        height: 37,
        x: 0,
        y: 878,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;
    const list = {
      querySelectorAll: () => [tableEntry, tryEntry],
      scrollHeight: 926,
      clientHeight: 412,
      closest: () => scrollEl,
      getBoundingClientRect: () => scrollRect,
    } as unknown as HTMLElement;

    const resolved = findPanelTocEntryAtPointerY(list, 843, scrollEl);
    expect(resolved).toBe(tryEntry);
    expect(panelTocEntryIndex(tryEntry)).toBe(11);
  });

  it("uses first-below-fold edge resolution in tocNavigation", () => {
    expect(tocSource).toContain("firstBelowFoldTop");
    expect(tocSource).not.toMatch(/belowFoldIndex/);
  });

  it("activates clipped TOC rows from document capture when testid click misses list", () => {
    expect(infoPanelSource).toContain("findPanelTocEntryAtLayoutPoint");
    expect(infoPanelSource).toContain("onDocumentClickCapture");
    const tryEntry = {
      getAttribute: () => "info-panel-toc-entry-11",
      getBoundingClientRect: () => ({
        top: 886,
        bottom: 927,
        left: 0,
        right: 606,
        width: 606,
        height: 41,
        x: 0,
        y: 886,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;
    const list = {
      querySelectorAll: () => [tryEntry],
      getBoundingClientRect: () => ({
        top: 433,
        bottom: 844,
        left: 0,
        right: 606,
        width: 606,
        height: 411,
        x: 0,
        y: 433,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;

    expect(findPanelTocEntryAtLayoutPoint(list, 301, 906)).toBe(tryEntry);
  });
});
