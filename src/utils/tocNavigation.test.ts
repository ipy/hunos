import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractTocFromDoc } from "./noteToc";
import {
  editorScrollDeltaForTocReveal,
  scrollToTocIndex,
  scrollToTocDocPos,
  handleInfoPanelTocTap,
  findPanelTocEntryAtPointerY,
  findPanelTocEntryAtLayoutPoint,
  resolvePanelTocScrollContainer,
  scrollPanelTocEntryIntoView,
  shouldDeferPanelTocScrollIntoView,
  panelTocEntryIndex,
} from "./tocNavigation";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    heading: {
      group: "block",
      content: "inline*",
      attrs: { level: { default: 1 } },
    },
    text: { group: "inline" },
  },
});

function docFromJson(json: unknown) {
  return schema.nodeFromJSON(json);
}

describe("editorScrollDeltaForTocReveal", () => {
  it("aligns heading below scroll pane top without overshooting", () => {
    const delta = editorScrollDeltaForTocReveal({
      scrollViewportTop: 100,
      scrollViewportBottom: 700,
      headingTop: 400,
      followBlockBottom: 440,
    });
    expect(delta).toBe(288);
    expect(400 - delta).toBe(112);
  });

  it("keeps follow block visible when heading would clip content below", () => {
    const delta = editorScrollDeltaForTocReveal({
      scrollViewportTop: 100,
      scrollViewportBottom: 200,
      headingTop: 350,
      followBlockBottom: 260,
    });
    expect(350 - delta).toBeGreaterThanOrEqual(100);
    expect(260 - delta).toBeLessThanOrEqual(192);
  });

  it("does not scroll heading above the pane top", () => {
    const delta = editorScrollDeltaForTocReveal({
      scrollViewportTop: 100,
      scrollViewportBottom: 700,
      headingTop: 95,
      followBlockBottom: 130,
    });
    expect(95 - delta).toBeGreaterThanOrEqual(100);
  });

  it("keeps follow block above info panel overlay", () => {
    const delta = editorScrollDeltaForTocReveal({
      scrollViewportTop: 100,
      scrollViewportBottom: 280,
      headingTop: 400,
      followBlockBottom: 440,
    });
    expect(400 - delta).toBeGreaterThanOrEqual(100);
    expect(440 - delta).toBeLessThanOrEqual(272);
  });

  it("does not overshoot heading above the pane top", () => {
    const delta = editorScrollDeltaForTocReveal({
      scrollViewportTop: 100,
      scrollViewportBottom: 180,
      headingTop: 500,
      followBlockBottom: 560,
    });
    expect(500 - delta).toBeGreaterThanOrEqual(112);
  });
});

describe("scrollToTocIndex", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("scrolls to the heading at the live TOC index", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "First" }],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Iter80 Live Heading" }],
        },
      ],
    };
    const toc = extractTocFromDoc(json);
    expect(toc[1]?.text).toBe("Iter80 Live Heading");

    const doc = docFromJson(json);
    const state = EditorState.create({ schema, doc });
    let selectionPos = -1;
    let scrollTop = 0;
    const scrollEl = {
      parentElement: null,
      scrollHeight: 2000,
      clientHeight: 600,
      getBoundingClientRect: () => ({
        top: 100,
        bottom: 700,
        left: 0,
        right: 400,
        width: 400,
        height: 600,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      }),
      scrollTo: (opts: { top: number }) => {
        scrollTop = opts.top;
      },
    };
    const headingEl = {
      tagName: "H2",
      nextElementSibling: {
        getBoundingClientRect: () => ({
          bottom: 440,
          top: 412,
          left: 24,
          right: 376,
          width: 352,
          height: 28,
          x: 24,
          y: 412,
          toJSON: () => ({}),
        }),
      },
      getBoundingClientRect: () => ({
        top: 400,
        bottom: 428,
        left: 24,
        right: 376,
        width: 352,
        height: 28,
        x: 24,
        y: 400,
        toJSON: () => ({}),
      }),
      parentElement: null,
    };
    const editor = {
      state,
      view: {
        state,
        dom: { parentElement: scrollEl },
        domAtPos: () => ({
          node: { nodeType: 3, parentElement: headingEl },
        }),
        coordsAtPos: () => ({
          top: 400,
          bottom: 428,
          left: 24,
          right: 376,
        }),
      },
      chain: () => {
        const chain = {
          focus: (_pos?: unknown, _opts?: { scrollIntoView?: boolean }) =>
            chain,
          setTextSelection: (pos: number) => {
            selectionPos = pos;
            return chain;
          },
          run: () => true,
        };
        return chain;
      },
    };

    vi.stubGlobal(
      "getComputedStyle",
      vi.fn(() => ({ overflowY: "auto" }) as CSSStyleDeclaration),
    );
    Object.defineProperty(scrollEl, "scrollTop", {
      get: () => scrollTop,
      set: (v: number) => {
        scrollTop = v;
      },
    });

    expect(scrollToTocIndex(editor as never, 1)).toBe(true);
    expect(selectionPos).toBeGreaterThan(0);
    expect(scrollTop).toBe(288);
  });

  it("returns false when the TOC index is out of range", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Only" }],
        },
      ],
    };
    const state = EditorState.create({ schema, doc: docFromJson(json) });
    const editor = {
      state,
      chain: () => ({
        focus: () => ({
          setTextSelection: () => ({
            run: () => true,
          }),
        }),
      }),
    };

    expect(scrollToTocIndex(editor as never, 5)).toBe(false);
  });
});

describe("handleInfoPanelTocTap", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false without scrolling when editor is null", () => {
    expect(handleInfoPanelTocTap(null, 0)).toBe(false);
  });

  it("scrolls to the heading without invoking panel close", () => {
    const json = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Iter92 Live Heading" }],
        },
      ],
    };
    const state = EditorState.create({ schema, doc: docFromJson(json) });
    let selectionPos = -1;
    const scrollEl = {
      parentElement: null,
      scrollTop: 0,
      scrollHeight: 800,
      clientHeight: 600,
      getBoundingClientRect: () => ({
        top: 100,
        bottom: 700,
        left: 0,
        right: 400,
        width: 400,
        height: 600,
        x: 0,
        y: 100,
        toJSON: () => ({}),
      }),
      scrollTo: () => undefined,
    };
    const headingEl = {
      tagName: "H2",
      nextElementSibling: null,
      getBoundingClientRect: () => ({
        top: 200,
        bottom: 228,
        left: 24,
        right: 376,
        width: 352,
        height: 28,
        x: 24,
        y: 200,
        toJSON: () => ({}),
      }),
      parentElement: null,
    };
    const editor = {
      state,
      view: {
        state,
        dom: { parentElement: scrollEl },
        domAtPos: () => ({
          node: { nodeType: 3, parentElement: headingEl },
        }),
        coordsAtPos: () => ({
          top: 200,
          bottom: 228,
          left: 24,
          right: 376,
        }),
      },
      chain: () => {
        const chain = {
          focus: (_pos?: unknown, _opts?: { scrollIntoView?: boolean }) =>
            chain,
          setTextSelection: (pos: number) => {
            selectionPos = pos;
            return chain;
          },
          run: () => true,
        };
        return chain;
      },
    };

    vi.stubGlobal(
      "getComputedStyle",
      vi.fn(() => ({ overflowY: "auto" }) as CSSStyleDeclaration),
    );

    expect(handleInfoPanelTocTap(editor as never, 0)).toBe(true);
    expect(selectionPos).toBeGreaterThan(0);
  });
});

describe("panel TOC pointer helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubGlobal(
      "getComputedStyle",
      vi.fn(() => ({ overflowY: "auto" }) as CSSStyleDeclaration),
    );
  });

  it("prefers the TOC list as scrollport when it overflows", () => {
    vi.stubGlobal(
      "getComputedStyle",
      vi.fn((el: HTMLElement) => {
        const isList = (el as { scrollHeight?: number }).scrollHeight === 500;
        return {
          overflowY: isList ? "auto" : "hidden",
        } as CSSStyleDeclaration;
      }),
    );
    const list = {
      scrollHeight: 500,
      clientHeight: 300,
      closest: () => null,
      parentElement: null,
    } as unknown as HTMLElement;
    const pane = {
      scrollHeight: 800,
      clientHeight: 300,
    } as unknown as HTMLElement;

    expect(resolvePanelTocScrollContainer(list, pane)).toBe(list);
  });

  it("ignores hidden-overflow parent even when its scrollHeight exceeds clientHeight", () => {
    vi.stubGlobal(
      "getComputedStyle",
      vi.fn((el: HTMLElement) => {
        const isList = (el as { scrollHeight?: number }).scrollHeight === 500;
        return {
          overflowY: isList ? "auto" : "hidden",
        } as CSSStyleDeclaration;
      }),
    );
    const pane = {
      scrollHeight: 900,
      clientHeight: 300,
    } as unknown as HTMLElement;
    const list = {
      scrollHeight: 500,
      clientHeight: 300,
      closest: () => pane,
      parentElement: pane,
    } as unknown as HTMLElement;

    expect(resolvePanelTocScrollContainer(list, pane)).toBe(list);
  });

  it("finds entries within bottom-edge slop", () => {
    const entry = {
      getAttribute: () => "info-panel-toc-entry-3",
      getBoundingClientRect: () => ({
        top: 800,
        bottom: 836,
        left: 0,
        right: 100,
        width: 100,
        height: 36,
        x: 0,
        y: 800,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;
    const list = {
      querySelectorAll: () => [entry],
      scrollHeight: 900,
      clientHeight: 412,
      closest: () => null,
      getBoundingClientRect: () => ({
        top: 432,
        bottom: 844,
        left: 0,
        right: 400,
        width: 400,
        height: 412,
        x: 0,
        y: 432,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;

    expect(findPanelTocEntryAtPointerY(list, 838)).toBe(entry);
    expect(findPanelTocEntryAtPointerY(list, 860)).toBeNull();
    expect(panelTocEntryIndex(entry)).toBe(3);
  });

  it("prefers below-fold row over the last visible row on bottom-edge taps", () => {
    const scrollRect = {
      top: 432,
      bottom: 844,
      left: 0,
      right: 400,
      width: 400,
      height: 412,
      x: 0,
      y: 432,
      toJSON: () => ({}),
    };
    const scrollEl = {
      getBoundingClientRect: () => scrollRect,
    } as unknown as HTMLElement;
    const tagsEntry = {
      getAttribute: () => "info-panel-toc-entry-10",
      getBoundingClientRect: () => ({
        top: 804,
        bottom: 841,
        left: 0,
        right: 100,
        width: 100,
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
        right: 100,
        width: 100,
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
      getBoundingClientRect: () => scrollRect,
    } as unknown as HTMLElement;

    expect(findPanelTocEntryAtPointerY(list, 840, scrollEl)).toBe(tryEntry);
  });

  it("prefers the last clipped row on bottom-edge taps", () => {
    const scrollRect = {
      top: 432,
      bottom: 844,
      left: 0,
      right: 400,
      width: 400,
      height: 412,
      x: 0,
      y: 432,
      toJSON: () => ({}),
    };
    const scrollEl = {
      getBoundingClientRect: () => scrollRect,
    } as unknown as HTMLElement;
    const tagsEntry = {
      getAttribute: () => "info-panel-toc-entry-10",
      getBoundingClientRect: () => ({
        top: 804,
        bottom: 841,
        left: 0,
        right: 100,
        width: 100,
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
        right: 100,
        width: 100,
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
      getBoundingClientRect: () => scrollRect,
    } as unknown as HTMLElement;

    expect(findPanelTocEntryAtPointerY(list, 841, scrollEl)).toBe(tryEntry);
    expect(findPanelTocEntryAtPointerY(list, 842, scrollEl)).toBe(tryEntry);
  });

  it("resolves fully below-fold entry on bottom-edge tap without slop overlap", () => {
    const scrollRect = {
      top: 432,
      bottom: 844,
      left: 0,
      right: 400,
      width: 400,
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
        right: 100,
        width: 100,
        height: 37,
        x: 0,
        y: 765,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;
    const tagsEntry = {
      getAttribute: () => "info-panel-toc-entry-10",
      getBoundingClientRect: () => ({
        top: 804,
        bottom: 841,
        left: 0,
        right: 100,
        width: 100,
        height: 37,
        x: 0,
        y: 804,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;
    const tryEntry = {
      getAttribute: () => "info-panel-toc-entry-11",
      getBoundingClientRect: () => ({
        top: 878,
        bottom: 915,
        left: 0,
        right: 100,
        width: 100,
        height: 37,
        x: 0,
        y: 878,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;
    const list = {
      querySelectorAll: () => [tableEntry, tagsEntry, tryEntry],
      scrollHeight: 926,
      clientHeight: 412,
      closest: () => scrollEl,
      getBoundingClientRect: () => scrollRect,
    } as unknown as HTMLElement;

    expect(findPanelTocEntryAtPointerY(list, 843, scrollEl)).toBe(tryEntry);
  });

  it("falls back to the last visible row in scroll bottom padding", () => {
    const scrollRect = {
      top: 432,
      bottom: 844,
      left: 0,
      right: 400,
      width: 400,
      height: 412,
      x: 0,
      y: 432,
      toJSON: () => ({}),
    };
    const scrollEl = {
      getBoundingClientRect: () => scrollRect,
    } as unknown as HTMLElement;
    const tryEntry = {
      getAttribute: () => "info-panel-toc-entry-11",
      getBoundingClientRect: () => ({
        top: 841,
        bottom: 878,
        left: 0,
        right: 100,
        width: 100,
        height: 37,
        x: 0,
        y: 841,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;
    const list = {
      querySelectorAll: () => [tryEntry],
      scrollHeight: 926,
      clientHeight: 412,
      closest: () => scrollEl,
      getBoundingClientRect: () => scrollRect,
    } as unknown as HTMLElement;

    expect(findPanelTocEntryAtPointerY(list, 843, scrollEl)).toBe(tryEntry);
  });

  it("resolves clipped entry-11 from layout bounds when click lands below panel fold", () => {
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
      querySelectorAll: () => [tableEntry, tryEntry],
      getBoundingClientRect: () => scrollRect,
    } as unknown as HTMLElement;

    expect(findPanelTocEntryAtLayoutPoint(list, 301, 906)).toBe(tryEntry);
    expect(findPanelTocEntryAtLayoutPoint(list, 301, 843)).toBeNull();
  });

  it("defers panel scroll when row is below fold and list scrollTop is 0", () => {
    const scrollRect = {
      top: 432,
      bottom: 844,
      left: 0,
      right: 400,
      width: 400,
      height: 412,
      x: 0,
      y: 432,
      toJSON: () => ({}),
    };
    let scrollTop = 0;
    const list = {
      scrollHeight: 926,
      clientHeight: 412,
      closest: () => null,
      getBoundingClientRect: () => scrollRect,
    } as unknown as HTMLElement;
    Object.defineProperty(list, "scrollTop", {
      get: () => scrollTop,
      set: (v: number) => {
        scrollTop = v;
      },
    });
    vi.stubGlobal(
      "getComputedStyle",
      vi.fn(() => ({ overflowY: "auto" }) as CSSStyleDeclaration),
    );
    const entry = {
      closest: (selector: string) =>
        selector.includes("info-panel-toc-list") ? list : null,
      getBoundingClientRect: () => ({
        top: 841,
        bottom: 878,
        left: 0,
        right: 100,
        width: 100,
        height: 37,
        x: 0,
        y: 841,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;

    expect(shouldDeferPanelTocScrollIntoView(entry)).toBe(true);
    scrollTop = 40;
    expect(shouldDeferPanelTocScrollIntoView(entry)).toBe(true);
  });

  it("defers panel scroll when Playwright pre-scrolls a below-fold row into view", () => {
    const scrollRect = {
      top: 432,
      bottom: 844,
      left: 0,
      right: 400,
      width: 400,
      height: 412,
      x: 0,
      y: 432,
      toJSON: () => ({}),
    };
    let scrollTop = 85;
    const list = {
      scrollHeight: 926,
      clientHeight: 412,
      closest: () => null,
      getBoundingClientRect: () => scrollRect,
    } as unknown as HTMLElement;
    Object.defineProperty(list, "scrollTop", {
      get: () => scrollTop,
      set: (v: number) => {
        scrollTop = v;
      },
    });
    vi.stubGlobal(
      "getComputedStyle",
      vi.fn(() => ({ overflowY: "auto" }) as CSSStyleDeclaration),
    );
    const entry = {
      closest: (selector: string) =>
        selector.includes("info-panel-toc-list") ? list : null,
      getBoundingClientRect: () => ({
        top: 756,
        bottom: 793,
        left: 0,
        right: 100,
        width: 100,
        height: 37,
        x: 0,
        y: 756,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;

    expect(shouldDeferPanelTocScrollIntoView(entry)).toBe(true);
  });

  it("scrolls a clipped entry into the panel viewport", () => {
    let scrollTop = 120;
    const list = {
      scrollHeight: 500,
      clientHeight: 300,
      parentElement: null,
      closest: () => null,
      getBoundingClientRect: () => ({
        top: 300,
        bottom: 600,
        left: 0,
        right: 400,
        width: 400,
        height: 300,
        x: 0,
        y: 300,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;
    Object.defineProperty(list, "scrollTop", {
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
    });
    const entry = {
      closest: (selector: string) =>
        selector.includes("info-panel-toc-list") ? list : null,
      getBoundingClientRect: () => ({
        top: 610,
        bottom: 646,
        left: 0,
        right: 100,
        width: 100,
        height: 36,
        x: 0,
        y: 610,
        toJSON: () => ({}),
      }),
    } as unknown as HTMLElement;

    scrollPanelTocEntryIntoView(entry);
    expect(scrollTop).toBe(174);
  });
});

describe("scrollToTocDocPos — playground jump (AC43/AC46)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function buildScrollableEditorMock(options: {
    headingTop: number;
    followBlockBottom: number;
    initialScrollTop?: number;
  }) {
    const json = {
      type: "doc",
      content: Array.from({ length: 12 }, (_, i) => ({
        type: "heading",
        attrs: { level: i === 10 ? 2 : 2 },
        content: [
          {
            type: "text",
            text:
              i === 10 ? "标签与链接" : i === 11 ? "自由试炼" : `Section ${i}`,
          },
        ],
      })),
    };
    const doc = docFromJson(json);
    const state = EditorState.create({ schema, doc });
    let scrollTop = options.initialScrollTop ?? 0;
    const scrollEl = {
      parentElement: null,
      scrollHeight: 8000,
      clientHeight: 506,
      getBoundingClientRect: () => ({
        top: 0,
        bottom: 506,
        left: 0,
        right: 606,
        width: 606,
        height: 506,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
      scrollTo: (opts: { top: number }) => {
        scrollTop = opts.top;
      },
    };
    const headingEl = {
      tagName: "H2",
      nextElementSibling: {
        getBoundingClientRect: () => ({
          bottom: options.followBlockBottom,
          top: options.followBlockBottom - 28,
          left: 24,
          right: 582,
          width: 558,
          height: 28,
          x: 24,
          y: options.followBlockBottom - 28,
          toJSON: () => ({}),
        }),
      },
      getBoundingClientRect: () => ({
        top: options.headingTop,
        bottom: options.headingTop + 28,
        left: 24,
        right: 582,
        width: 558,
        height: 28,
        x: 24,
        y: options.headingTop,
        toJSON: () => ({}),
      }),
      parentElement: null,
    };
    const infoPanel = {
      getBoundingClientRect: () => ({
        top: 338,
        bottom: 844,
        left: 0,
        right: 606,
        width: 606,
        height: 506,
        x: 0,
        y: 338,
        toJSON: () => ({}),
      }),
    };
    const editor = {
      state,
      view: {
        state,
        dom: { parentElement: scrollEl },
        domAtPos: () => ({
          node: { nodeType: 3, parentElement: headingEl },
        }),
        coordsAtPos: () => ({
          top: options.headingTop,
          bottom: options.headingTop + 28,
          left: 24,
          right: 582,
        }),
      },
      chain: () => {
        const chain = {
          focus: (_pos?: unknown, _opts?: { scrollIntoView?: boolean }) =>
            chain,
          setTextSelection: () => chain,
          run: () => true,
        };
        return chain;
      },
    };

    vi.stubGlobal(
      "getComputedStyle",
      vi.fn(() => ({ overflowY: "auto" }) as CSSStyleDeclaration),
    );
    vi.stubGlobal("document", {
      querySelector: (sel: string) =>
        sel.includes("info-panel") ? infoPanel : null,
    });
    Object.assign(scrollEl, {
      ownerDocument: {
        querySelector: (sel: string) =>
          sel.includes("info-panel") ? infoPanel : null,
      },
    });
    Object.defineProperty(scrollEl, "scrollTop", {
      get: () => scrollTop,
      set: (v: number) => {
        scrollTop = v;
      },
    });

    return { editor, scrollEl, getScrollTop: () => scrollTop };
  }

  it("scrolls editor on first activation of 标签与链接 (index 10) from scrollTop 0", () => {
    const { editor, getScrollTop } = buildScrollableEditorMock({
      headingTop: 4200,
      followBlockBottom: 4240,
      initialScrollTop: 0,
    });

    expect(scrollToTocIndex(editor as never, 10)).toBe(true);
    expect(getScrollTop()).toBeGreaterThan(0);
  });

  it("scrolls editor on first click of 自由试炼 (index 11) while TOC list stays at scrollTop 0", () => {
    const { editor, getScrollTop } = buildScrollableEditorMock({
      headingTop: 4800,
      followBlockBottom: 4840,
      initialScrollTop: 0,
    });

    expect(handleInfoPanelTocTap(editor as never, 11)).toBe(true);
    expect(getScrollTop()).toBeGreaterThan(0);
  });

  it("visibility guard scrolls when heading remains below info-panel-clamped viewport", () => {
    const { editor, getScrollTop } = buildScrollableEditorMock({
      headingTop: 800,
      followBlockBottom: 840,
      initialScrollTop: 0,
    });

    expect(scrollToTocIndex(editor as never, 11)).toBe(true);
    expect(getScrollTop()).toBeGreaterThan(0);
  });

  it("scrollToTocDocPos applies scroll with info panel viewport clamp", () => {
    const { editor, getScrollTop } = buildScrollableEditorMock({
      headingTop: 4200,
      followBlockBottom: 4240,
    });
    let headingPos = 0;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading" && node.textContent === "标签与链接") {
        headingPos = pos;
        return false;
      }
    });

    expect(scrollToTocDocPos(editor as never, headingPos)).toBe(true);
    expect(getScrollTop()).toBeGreaterThan(0);
    expect(4200 - getScrollTop()).toBeLessThanOrEqual(12 + 1);
  });
});
