import { describe, expect, it } from "vitest";
import { Schema } from "@tiptap/pm/model";
import {
  computeImageResizeHeight,
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
