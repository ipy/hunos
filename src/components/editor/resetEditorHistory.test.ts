import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { history, undo, undoDepth } from "@tiptap/pm/history";
import { describe, expect, it } from "vitest";
import { createStateWithFreshHistory } from "./resetEditorHistory";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
  },
});

function stateWithText(text: string) {
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, text ? [schema.text(text)] : []),
  ]);
  return EditorState.create({
    doc,
    schema,
    selection: TextSelection.create(doc, 1),
    plugins: [history()],
  });
}

function insertTextAtEnd(state: EditorState, text: string) {
  const end = state.doc.content.size - 1;
  const tr = state.tr.insertText(text, end);
  return state.apply(tr);
}

describe("createStateWithFreshHistory", () => {
  it("clears undo stack so prior note edits cannot be undone", () => {
    let state = stateWithText("");
    state = insertTextAtEnd(state, "UndoScopeAlpha");
    expect(undoDepth(state)).toBeGreaterThan(0);

    const reset = createStateWithFreshHistory(state);
    expect(undoDepth(reset)).toBe(0);

    let undone = false;
    undo(reset, () => {
      undone = true;
    });
    expect(undone).toBe(false);
    expect(reset.doc.textContent).toBe("UndoScopeAlpha");
  });

  it("preserves current document content after reset", () => {
    let state = stateWithText("UndoScopeBeta");
    state = insertTextAtEnd(state, " extra");

    const reset = createStateWithFreshHistory(state);

    expect(reset.doc.textContent).toBe("UndoScopeBeta extra");
    expect(undoDepth(reset)).toBe(0);
  });
});
