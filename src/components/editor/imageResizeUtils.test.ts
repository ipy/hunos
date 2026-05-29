import { describe, expect, it } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { EditorState, NodeSelection, TextSelection } from "@tiptap/pm/state";
import {
  computeImageResizeHeight,
  handleBlockImageClick,
  isResizableBlockImage,
  MIN_BLOCK_IMAGE_HEIGHT,
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
