import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it, beforeEach } from "vitest";
import {
  captureLinkEditorSelection,
  clearLinkEditorSelection,
  getLinkEditorAnchorRect,
  getSavedLinkEditorSelection,
  restoreLinkEditorSelection,
} from "./linkEditorSelection";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
  },
});

function createEditorLike(state: EditorState) {
  let currentState = state;
  return {
    state: currentState,
    commands: {
      setTextSelection: (range: { from: number; to: number }) => {
        currentState = currentState.apply(
          currentState.tr.setSelection(
            TextSelection.create(currentState.doc, range.from, range.to),
          ),
        );
        return true;
      },
    },
    get stateRef() {
      return currentState;
    },
  };
}

describe("linkEditorSelection", () => {
  beforeEach(() => {
    clearLinkEditorSelection();
  });

  it("captures and restores a non-empty text selection", () => {
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [schema.text("hello world")]),
    ]);
    const state = EditorState.create({
      doc,
      schema,
      selection: TextSelection.create(doc, 1, 6),
    });
    const editor = createEditorLike(state);

    captureLinkEditorSelection(editor as never);
    expect(getSavedLinkEditorSelection()).toEqual({ from: 1, to: 6 });

    const collapsed = EditorState.create({
      doc,
      schema,
      selection: TextSelection.create(doc, 12),
    });
    (editor as { state: EditorState }).state = collapsed;

    restoreLinkEditorSelection(editor as never);
    const { from, to } = editor.stateRef.selection;
    expect(from).toBe(1);
    expect(to).toBe(6);
  });

  it("clears saved selection", () => {
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [schema.text("x")]),
    ]);
    const state = EditorState.create({
      doc,
      schema,
      selection: TextSelection.create(doc, 1, 2),
    });
    captureLinkEditorSelection(createEditorLike(state) as never);
    clearLinkEditorSelection();
    expect(getSavedLinkEditorSelection()).toBeNull();
  });
});

describe("getLinkEditorAnchorRect", () => {
  beforeEach(() => {
    clearLinkEditorSelection();
  });

  it("returns null for destroyed editors", () => {
    expect(getLinkEditorAnchorRect({ isDestroyed: true } as never)).toBeNull();
  });
});
