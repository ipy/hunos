import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { afterEach, describe, expect, it, vi } from "vitest";
import { extractTocFromDoc } from "./noteToc";
import {
  editorScrollDeltaForTocReveal,
  scrollToTocIndex,
  handleInfoPanelTocTap,
  findPanelTocEntryAtPointerY,
  scrollPanelTocEntryIntoView,
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
    } as unknown as HTMLElement;

    expect(findPanelTocEntryAtPointerY(list, 838)).toBe(entry);
    expect(findPanelTocEntryAtPointerY(list, 850)).toBeNull();
    expect(panelTocEntryIndex(entry)).toBe(3);
  });

  it("scrolls a clipped entry into the panel viewport", () => {
    let scrollTop = 120;
    const scrollEl = {
      scrollTop: 0,
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
    Object.defineProperty(scrollEl, "scrollTop", {
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
    });

    const list = {
      parentElement: scrollEl,
      closest: () => null,
    } as unknown as HTMLElement;
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
