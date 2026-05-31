import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findPanelTocEntryAtLayoutPoint,
  findPanelTocEntryAtPointerY,
  panelTocEntryIndex,
  shouldDeferPanelTocScrollIntoView,
} from "@/utils/tocNavigation";

const infoPanelSource = readFileSync(
  join(process.cwd(), "src/components/editor/InfoPanel.tsx"),
  "utf-8",
);

/** Playground entry-11 layout at 606×844 with tocScrollTop=0 (AC44 gate). */
function mockEntry11BelowFold() {
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
    scrollTop: 0,
    clientHeight: 412,
    getBoundingClientRect: () => scrollRect,
  } as unknown as HTMLElement;
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
    scrollHeight: 926,
    clientHeight: 412,
    scrollTop: 0,
    closest: () => scrollEl,
    getBoundingClientRect: () => scrollRect,
  } as unknown as HTMLElement;
  return { scrollEl, tryEntry, list, layoutCenterY: 906 };
}

describe("iteration 52 — AC44 pointer–DOM parity", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves entry-11 from layout center when pointer hits html below the fold", () => {
    const { list, tryEntry, layoutCenterY } = mockEntry11BelowFold();
    expect(findPanelTocEntryAtLayoutPoint(list, 301, layoutCenterY)).toBe(
      tryEntry,
    );
    expect(panelTocEntryIndex(tryEntry)).toBe(11);
  });

  it("defers panel list scroll for below-fold entry-11 at scrollTop 0", () => {
    vi.stubGlobal(
      "getComputedStyle",
      vi.fn(() => ({ overflowY: "auto" }) as CSSStyleDeclaration),
    );
    const { tryEntry, list } = mockEntry11BelowFold();
    expect(shouldDeferPanelTocScrollIntoView(tryEntry, list)).toBe(true);
  });

  it("routes off-list testid clicks through document capture to activateTocEntry", () => {
    expect(infoPanelSource).toContain("onDocumentClickCapture");
    expect(infoPanelSource).toContain("findPanelTocEntryAtLayoutPoint");
    const captureBlock = infoPanelSource.slice(
      infoPanelSource.indexOf("onDocumentClickCapture"),
      infoPanelSource.indexOf("const activateTocAtClientY"),
    );
    expect(captureBlock).toContain("event.preventDefault()");
    expect(captureBlock).toContain("activateTocEntry");
  });

  it("keeps synthetic element.click on the entry button for in-list activation", () => {
    const entryBlock = infoPanelSource.slice(
      infoPanelSource.indexOf("data-testid={`info-panel-toc-entry-${i}`}"),
      infoPanelSource.indexOf('touchAction: "manipulation"'),
    );
    expect(entryBlock).toMatch(/onClick=\{/);
    expect(entryBlock).toContain("activateTocEntry");
    expect(entryBlock).not.toMatch(/onPointerDown=\{/);
  });

  it("aligns bottom-edge pointer Y with layout-bounds center for entry-11", () => {
    vi.stubGlobal(
      "getComputedStyle",
      vi.fn(() => ({ overflowY: "auto" }) as CSSStyleDeclaration),
    );
    const { list, tryEntry, scrollEl, layoutCenterY } = mockEntry11BelowFold();
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
    const listWithTwo = {
      ...list,
      querySelectorAll: () => [tagsEntry, tryEntry],
    } as unknown as HTMLElement;

    expect(findPanelTocEntryAtPointerY(listWithTwo, 843, scrollEl)).toBe(
      tryEntry,
    );
    expect(
      findPanelTocEntryAtLayoutPoint(listWithTwo, 301, layoutCenterY),
    ).toBe(tryEntry);
  });
});
