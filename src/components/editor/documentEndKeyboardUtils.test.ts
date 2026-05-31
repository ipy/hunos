import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it, vi } from "vitest";
import { moveCaretToDocumentEnd } from "./documentEndKeyboardUtils";

vi.mock("@/utils/editorSuggestionMenu", () => ({
  isEditorSuggestionMenuOpen: () => false,
  isLinkEditorOpen: () => false,
}));

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
  },
});

const { doc, paragraph } = schema.nodes;

describe("moveCaretToDocumentEnd (AC33-cmd-end)", () => {
  it("moves the caret to the last editable position", () => {
    const document = doc.create({}, [
      paragraph.create({}, schema.text("first")),
      paragraph.create({}, schema.text("last line")),
    ]);
    const state = EditorState.create({
      doc: document,
      schema,
      selection: TextSelection.create(document, 2),
    });

    let selectedPos = 0;
    const editor = {
      state,
      chain: () => {
        const chain = {
          focus: () => chain,
          setTextSelection: (selection: TextSelection) => {
            selectedPos = selection.from;
            return chain;
          },
          scrollIntoView: () => chain,
          run: () => true,
        };
        return chain;
      },
    };

    expect(moveCaretToDocumentEnd(editor as never)).toBe(true);
    expect(selectedPos).toBe(document.content.size - 1);
  });
});
