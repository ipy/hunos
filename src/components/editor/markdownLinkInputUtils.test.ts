import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import { tryApplyMarkdownLinkOnSpace } from "./markdownLinkInputUtils";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
  },
  marks: {
    link: {
      attrs: { href: { default: null } },
      inclusive: false,
      parseDOM: [{ tag: "a[href]" }],
      toDOM: (mark) => ["a", { href: mark.attrs.href }, 0],
    },
  },
});

const { doc, paragraph } = schema.nodes;

describe("tryApplyMarkdownLinkOnSpace", () => {
  it("converts markdown link syntax when Space is pressed", () => {
    const markdown = "[Example](https://example.com)";
    const document = doc.create({}, [
      paragraph.create({}, schema.text(markdown)),
    ]);
    const cursorPos = 1 + markdown.length;
    const state = EditorState.create({
      doc: document,
      schema,
      selection: TextSelection.create(document, cursorPos),
    });

    let nextState = state;
    const editor = {
      state,
      get stateRef() {
        return nextState;
      },
      view: {
        dispatch(tr: typeof state.tr) {
          nextState = state.apply(tr);
        },
      },
    };

    expect(tryApplyMarkdownLinkOnSpace(editor)).toBe(true);
    expect(nextState.doc.textContent).toBe("Example ");
    const linkMark = nextState.doc.firstChild?.firstChild?.marks.find(
      (mark) => mark.type.name === "link",
    );
    expect(linkMark?.attrs.href).toBe("https://example.com");
  });
});
