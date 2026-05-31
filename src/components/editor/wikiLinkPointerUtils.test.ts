import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { describe, expect, it, vi } from "vitest";
import {
  findEditorScrollContainer,
  isPointerOverEditorColumn,
  wikiLinkMatchAtPointer,
  wikiLinkMatchAtScrollMappedPointer,
  type WikiLinkPointerMatch,
} from "./wikiLinkPointerUtils";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
  },
});

const { doc, paragraph } = schema.nodes;

function stubComputedStyle(scrollParent: object) {
  vi.stubGlobal(
    "getComputedStyle",
    vi.fn((el: Element) => {
      return {
        overflowY: el === scrollParent ? "auto" : "visible",
      } as CSSStyleDeclaration;
    }),
  );
}

function mockView(options: {
  left?: number;
  right?: number;
  scrollTop?: number;
  editorTop?: number;
  linkTop?: number;
  linkBottom?: number;
  linkLeft?: number;
  linkRight?: number;
  posAtCoords?: (left: number, top: number) => { pos: number } | null;
}): EditorView {
  const pmDoc = doc.create({}, [
    paragraph.create({}, [schema.text("见 [[项目文档]] 了解更多。")]),
  ]);
  const state = EditorState.create({ schema, doc: pmDoc });

  const left = options.left ?? 100;
  const right = options.right ?? 500;
  const editorTop = options.editorTop ?? 120;
  const scrollTop = options.scrollTop ?? 0;
  const linkTop = options.linkTop ?? 1491;
  const linkBottom = options.linkBottom ?? 1510;
  const linkLeft = options.linkLeft ?? 400;
  const linkRight = options.linkRight ?? 480;

  const scrollParent = {
    parentElement: null as HTMLElement | null,
    scrollTop,
    scrollLeft: 0,
    scrollHeight: 3000,
    clientHeight: 780,
    getBoundingClientRect: () => ({
      left,
      right,
      top: editorTop,
      bottom: editorTop + 780,
      width: right - left,
      height: 780,
    }),
  };

  const dom = {
    parentElement: scrollParent as unknown as HTMLElement,
    getBoundingClientRect: () => ({
      left,
      right,
      top: editorTop,
      bottom: editorTop + 780,
      width: right - left,
      height: 780,
    }),
  };

  stubComputedStyle(scrollParent);

  return {
    state,
    dom: dom as unknown as HTMLElement,
    coordsAtPos: (pos: number) => {
      if (pos >= 4 && pos <= 8) {
        return {
          top: linkTop,
          bottom: linkBottom,
          left: linkLeft,
          right: linkRight,
        };
      }
      return { top: 0, bottom: 0, left: 0, right: 0 };
    },
    posAtCoords: ({ left: x, top: y }: { left: number; top: number }) =>
      options.posAtCoords?.(x, y) ?? null,
  } as unknown as EditorView;
}

describe("wikiLinkMatchAtPointer", () => {
  const links: WikiLinkPointerMatch[] = [
    {
      start: 2,
      end: 10,
      contentStart: 4,
      contentEnd: 8,
      title: "项目文档",
    },
  ];

  it("matches below-viewport pointer coords when link bbox is offscreen", () => {
    const view = mockView({ editorTop: 162, scrollTop: 0 });
    const event = { clientX: 423, clientY: 1491 } as PointerEvent;

    expect(wikiLinkMatchAtPointer(view, event, links)?.title).toBe("项目文档");
  });

  it("matches after the editor pane has scrolled", () => {
    const view = mockView({
      editorTop: 162,
      scrollTop: 600,
      linkTop: 891,
      linkBottom: 910,
    });
    const event = { clientX: 423, clientY: 891 } as PointerEvent;

    expect(wikiLinkMatchAtPointer(view, event, links)?.title).toBe("项目文档");
  });

  it("returns null when pointer is outside the editor column", () => {
    const view = mockView({});
    const event = { clientX: 20, clientY: 1491 } as PointerEvent;

    expect(wikiLinkMatchAtPointer(view, event, links)).toBeNull();
  });

  it("returns null when pointer misses every wiki-link bbox", () => {
    const view = mockView({});
    const event = { clientX: 423, clientY: 200 } as PointerEvent;

    expect(wikiLinkMatchAtPointer(view, event, links)).toBeNull();
  });
});

describe("wikiLinkMatchAtScrollMappedPointer", () => {
  const links: WikiLinkPointerMatch[] = [
    {
      start: 2,
      end: 10,
      contentStart: 4,
      contentEnd: 8,
      title: "项目文档",
    },
  ];

  it("falls back to posAtCoords when content-space bbox match fails", () => {
    const view = mockView({
      linkTop: 200,
      linkBottom: 220,
      posAtCoords: (left, top) =>
        left === 423 && top === 1491 ? { pos: 6 } : null,
    });
    const event = { clientX: 423, clientY: 1491 } as PointerEvent;

    expect(wikiLinkMatchAtScrollMappedPointer(view, event, links)?.title).toBe(
      "项目文档",
    );
  });
});

describe("findEditorScrollContainer", () => {
  it("returns the nearest overflow auto ancestor", () => {
    const scroll = {
      parentElement: null,
      scrollHeight: 2000,
      clientHeight: 600,
    };
    const editor = {
      parentElement: scroll,
    };

    vi.stubGlobal(
      "getComputedStyle",
      vi.fn(() => ({ overflowY: "auto" }) as CSSStyleDeclaration),
    );

    expect(findEditorScrollContainer(editor as unknown as HTMLElement)).toBe(
      scroll,
    );
  });

  it("falls back to overflow auto ancestor when not yet scrollable", () => {
    const scroll = {
      parentElement: null,
      scrollHeight: 600,
      clientHeight: 600,
    };
    const editor = {
      parentElement: scroll,
    };

    vi.stubGlobal(
      "getComputedStyle",
      vi.fn(() => ({ overflowY: "auto" }) as CSSStyleDeclaration),
    );

    expect(findEditorScrollContainer(editor as unknown as HTMLElement)).toBe(
      scroll,
    );
  });
});

describe("isPointerOverEditorColumn", () => {
  it("accepts horizontal hits within the editor column", () => {
    const view = mockView({ left: 100, right: 500 });
    expect(isPointerOverEditorColumn(view, 250)).toBe(true);
    expect(isPointerOverEditorColumn(view, 90)).toBe(false);
  });
});
