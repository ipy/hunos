import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import { extractTocFromDoc } from "./noteToc";
import { scrollToTocIndex } from "./tocNavigation";

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

describe("scrollToTocIndex", () => {
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
    const editor = {
      state,
      chain: () => {
        const chain = {
          focus: () => chain,
          setTextSelection: (pos: number) => {
            selectionPos = pos;
            return chain;
          },
          scrollIntoView: () => chain,
          run: () => true,
        };
        return chain;
      },
    };

    expect(scrollToTocIndex(editor as never, 1)).toBe(true);
    expect(selectionPos).toBeGreaterThan(0);
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
            scrollIntoView: () => ({ run: () => true }),
          }),
        }),
      }),
    };

    expect(scrollToTocIndex(editor as never, 5)).toBe(false);
  });
});
