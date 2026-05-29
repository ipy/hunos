import { describe, expect, it, vi } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { EditorState, NodeSelection, TextSelection } from "@tiptap/pm/state";
import {
  computeImageResizeHeight,
  getSelectedBlockImagePos,
  handleBlockImageClick,
  handleBlockImageMousedown,
  imageResizeHandleAttributes,
  isImageResizeHandleActive,
  isResizableBlockImage,
  MIN_BLOCK_IMAGE_HEIGHT,
  selectBlockImageNode,
  syncImageResizeHandleAttributes,
} from "./imageResizeUtils";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    image: {
      group: "block",
      inline: false,
      attrs: { src: {}, alt: { default: null }, height: { default: null } },
    },
    text: { group: "inline" },
  },
});

describe("isResizableBlockImage", () => {
  it("returns true for block image nodes", () => {
    const image = schema.nodes.image.create({ src: "test.png" });
    expect(isResizableBlockImage(image)).toBe(true);
  });

  it("returns false for non-image nodes", () => {
    const paragraph = schema.nodes.paragraph.create();
    expect(isResizableBlockImage(paragraph)).toBe(false);
  });
});

describe("getSelectedBlockImagePos", () => {
  it("returns position when a block image is node-selected", () => {
    const image = schema.nodes.image.create({ src: "test.png" });
    const doc = schema.node("doc", null, [image]);
    const state = EditorState.create({
      doc,
      schema,
      selection: NodeSelection.create(doc, 0),
    });

    expect(getSelectedBlockImagePos(state)).toBe(0);
  });

  it("returns null for text selection", () => {
    const image = schema.nodes.image.create({ src: "test.png" });
    const doc = schema.node("doc", null, [image]);
    const state = EditorState.create({
      doc,
      schema,
      selection: TextSelection.create(doc, 1),
    });

    expect(getSelectedBlockImagePos(state)).toBeNull();
  });
});

describe("isImageResizeHandleActive", () => {
  it("is true only for the selected image position", () => {
    const image = schema.nodes.image.create({ src: "test.png" });
    const doc = schema.node("doc", null, [image]);
    const state = EditorState.create({
      doc,
      schema,
      selection: NodeSelection.create(doc, 0),
    });

    expect(isImageResizeHandleActive(state, 0)).toBe(true);
    expect(isImageResizeHandleActive(state, 1)).toBe(false);
  });
});

describe("imageResizeHandleAttributes", () => {
  it("marks active handles for automation", () => {
    expect(imageResizeHandleAttributes(3, true)).toEqual({
      "data-testid": "image-resize-handle",
      "data-image-resize-pos": "3",
      "data-active": "true",
    });
    expect(imageResizeHandleAttributes(3, false)).toEqual({
      "data-testid": "image-resize-handle",
      "data-image-resize-pos": "3",
    });
  });
});

describe("selectBlockImageNode", () => {
  it("dispatches NodeSelection for a block image", () => {
    const image = schema.nodes.image.create({ src: "test.png" });
    const doc = schema.node("doc", null, [image]);
    const imagePos = 0;
    const state = EditorState.create({
      doc,
      schema,
      selection: TextSelection.create(doc, 1),
    });
    const dispatched: EditorState[] = [];
    const view = {
      state,
      dispatch(tr: { selection: typeof state.selection }) {
        dispatched.push(state.apply(tr as Parameters<typeof state.apply>[0]));
      },
    } as Parameters<typeof selectBlockImageNode>[0];

    expect(selectBlockImageNode(view, imagePos)).toBe(true);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].selection).toBeInstanceOf(NodeSelection);
    expect((dispatched[0].selection as NodeSelection).from).toBe(imagePos);
  });

  it("returns false when the image is already selected", () => {
    const image = schema.nodes.image.create({ src: "test.png" });
    const doc = schema.node("doc", null, [image]);
    const state = EditorState.create({
      doc,
      schema,
      selection: NodeSelection.create(doc, 0),
    });
    const view = { state, dispatch: () => {} } as Parameters<
      typeof selectBlockImageNode
    >[0];

    expect(selectBlockImageNode(view, 0)).toBe(false);
  });
});

describe("handleBlockImageMousedown", () => {
  it("selects the image and prevents default on mousedown", () => {
    const image = schema.nodes.image.create({ src: "test.png" });
    const doc = schema.node("doc", null, [image]);
    const state = EditorState.create({
      doc,
      schema,
      selection: TextSelection.create(doc, 1),
    });
    const dispatched: EditorState[] = [];
    const img = {
      closest(selector: string) {
        return selector === "img.editor-image" ? img : null;
      },
    };
    const view = {
      state,
      dom: { contains: () => true },
      posAtDOM: () => 0,
      dispatch(tr: { selection: typeof state.selection }) {
        dispatched.push(state.apply(tr as Parameters<typeof state.apply>[0]));
      },
    } as Parameters<typeof handleBlockImageMousedown>[0];

    const event = {
      target: img,
      preventDefault: vi.fn(),
    } as unknown as Event;

    expect(handleBlockImageMousedown(view, event)).toBe(true);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].selection).toBeInstanceOf(NodeSelection);
  });
});

describe("syncImageResizeHandleAttributes", () => {
  it("sets data-active on the handle for the selected image", () => {
    const image = schema.nodes.image.create({ src: "test.png" });
    const doc = schema.node("doc", null, [image]);
    const state = EditorState.create({
      doc,
      schema,
      selection: NodeSelection.create(doc, 0),
    });

    function mockHandle(pos: string) {
      const attrs = new Map<string, string>([
        ["data-testid", "image-resize-handle"],
        ["data-image-resize-pos", pos],
      ]);
      return {
        getAttribute(name: string) {
          return attrs.get(name) ?? null;
        },
        setAttribute(name: string, value: string) {
          attrs.set(name, value);
        },
        removeAttribute(name: string) {
          attrs.delete(name);
        },
        hasAttribute(name: string) {
          return attrs.has(name);
        },
      };
    }

    const activeHandle = mockHandle("0");
    const idleHandle = mockHandle("5");
    const dom = {
      querySelectorAll: () => [activeHandle, idleHandle],
    };

    syncImageResizeHandleAttributes({ state, dom } as Parameters<
      typeof syncImageResizeHandleAttributes
    >[0]);

    expect(activeHandle.getAttribute("data-active")).toBe("true");
    expect(idleHandle.hasAttribute("data-active")).toBe(false);
  });
});

describe("handleBlockImageClick", () => {
  it("selects a block image node on click", () => {
    const image = schema.nodes.image.create({ src: "test.png" });
    const doc = schema.node("doc", null, [image]);
    const imagePos = 0;
    const state = EditorState.create({
      doc,
      schema,
      selection: TextSelection.create(doc, 1),
    });
    const dispatched: EditorState[] = [];
    const view = {
      state,
      dispatch(tr: { selection: typeof state.selection }) {
        dispatched.push(state.apply(tr as Parameters<typeof state.apply>[0]));
      },
    } as Parameters<typeof handleBlockImageClick>[0];

    expect(handleBlockImageClick(view, image, imagePos)).toBe(true);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].selection).toBeInstanceOf(NodeSelection);
    expect((dispatched[0].selection as NodeSelection).from).toBe(imagePos);
  });

  it("returns false for non-image nodes", () => {
    const paragraph = schema.nodes.paragraph.create();
    const doc = schema.node("doc", null, [paragraph]);
    const state = EditorState.create({ doc, schema });
    const view = { state, dispatch: () => {} } as Parameters<
      typeof handleBlockImageClick
    >[0];

    expect(handleBlockImageClick(view, paragraph, 0)).toBe(false);
  });

  it("returns false when the image is already selected", () => {
    const image = schema.nodes.image.create({ src: "test.png" });
    const doc = schema.node("doc", null, [image]);
    const state = EditorState.create({
      doc,
      schema,
      selection: NodeSelection.create(doc, 0),
    });
    const view = { state, dispatch: () => {} } as Parameters<
      typeof handleBlockImageClick
    >[0];

    expect(handleBlockImageClick(view, image, 0)).toBe(false);
  });
});

describe("computeImageResizeHeight", () => {
  it("increases height when dragging downward", () => {
    expect(computeImageResizeHeight(200, 100, 180)).toBe(280);
  });

  it("decreases height when dragging upward", () => {
    expect(computeImageResizeHeight(200, 100, 50)).toBe(150);
  });

  it("clamps to the minimum height", () => {
    expect(computeImageResizeHeight(200, 100, -200)).toBe(
      MIN_BLOCK_IMAGE_HEIGHT,
    );
  });

  it("rounds fractional pixel values", () => {
    expect(computeImageResizeHeight(100, 0, 10.7)).toBe(111);
  });
});
