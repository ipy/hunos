import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { history, undo } from "@tiptap/pm/history";
import { schema as basicSchema } from "@tiptap/pm/schema-basic";
import { describe, expect, it } from "vitest";
import {
  createFindInNotePlugin,
  findInNotePluginKey,
  getFindInNoteState,
} from "./FindInNoteExtension";
import { findMatchesInDoc, sortMatchesForReplaceAll } from "./findInNoteUtils";

const schema = new Schema({
  nodes: basicSchema.spec.nodes,
  marks: basicSchema.spec.marks,
});

function docFromText(text: string) {
  return schema.node("doc", null, [
    schema.node("paragraph", null, [schema.text(text)]),
  ]);
}

function createFindState(text: string) {
  const doc = docFromText(text);
  return EditorState.create({
    doc,
    schema,
    selection: TextSelection.create(doc, 1),
    plugins: [history(), createFindInNotePlugin()],
  });
}

function applyMeta(
  state: EditorState,
  meta: {
    type:
      | "open"
      | "close"
      | "setQuery"
      | "setReplaceText"
      | "next"
      | "prev"
      | "afterReplaceOne"
      | "afterReplaceAll";
    query?: string;
    replaceText?: string;
  },
) {
  return state.apply(state.tr.setMeta(findInNotePluginKey, meta));
}

function replaceActiveMatch(state: EditorState) {
  const pluginState = getFindInNoteState(state);
  if (!pluginState?.open) return state;

  const query = pluginState.query.trim();
  if (!query) return state;

  const match = pluginState.matches[pluginState.activeIndex];
  if (!match) return state;

  const marks = state.doc.resolve(match.from).marks();
  let tr = state.tr;
  if (pluginState.replaceText) {
    const node = state.schema.text(pluginState.replaceText, marks);
    tr = tr.replaceWith(match.from, match.to, node);
  } else {
    tr = tr.delete(match.from, match.to);
  }
  tr = tr.setMeta(findInNotePluginKey, { type: "afterReplaceOne" });
  return state.apply(tr);
}

function replaceAllMatches(state: EditorState) {
  const pluginState = getFindInNoteState(state);
  if (!pluginState?.open) return state;

  const query = pluginState.query.trim();
  if (!query) return state;

  const matches = findMatchesInDoc(state.doc, query);
  if (matches.length === 0) return state;

  let tr = state.tr;
  for (const match of sortMatchesForReplaceAll(matches)) {
    const marks = state.doc.resolve(match.from).marks();
    if (pluginState.replaceText) {
      const node = state.schema.text(pluginState.replaceText, marks);
      tr = tr.replaceWith(match.from, match.to, node);
    } else {
      tr = tr.delete(match.from, match.to);
    }
  }
  tr = tr.setMeta(findInNotePluginKey, { type: "afterReplaceAll" });
  return state.apply(tr);
}

function docText(state: EditorState) {
  return state.doc.textContent;
}

function applyUndo(state: EditorState) {
  let next = state;
  undo(state, (tr) => {
    next = state.apply(tr);
  });
  return next;
}

describe("FindInNoteExtension replace", () => {
  it("replace-one mutates the active match after navigation", () => {
    let state = createFindState("foo bar foo baz foo");
    state = applyMeta(state, { type: "open" });
    state = applyMeta(state, { type: "setQuery", query: "foo" });
    state = applyMeta(state, { type: "next" });
    state = applyMeta(state, { type: "next" });

    expect(getFindInNoteState(state)?.activeIndex).toBe(2);

    // Same-query flush must not reset active index before replace.
    state = applyMeta(state, { type: "setQuery", query: "foo" });
    expect(getFindInNoteState(state)?.activeIndex).toBe(2);

    state = applyMeta(state, { type: "setReplaceText", replaceText: "qux" });
    state = replaceActiveMatch(state);

    expect(docText(state)).toBe("foo bar foo baz qux");
    expect(getFindInNoteState(state)?.activeIndex).toBe(0);
  });

  it("replace-one advances to the next match in document order", () => {
    let state = createFindState("foo foo foo");
    state = applyMeta(state, { type: "open" });
    state = applyMeta(state, { type: "setQuery", query: "foo" });
    expect(getFindInNoteState(state)?.activeIndex).toBe(0);

    state = applyMeta(state, { type: "setReplaceText", replaceText: "qux" });
    state = replaceActiveMatch(state);

    expect(docText(state)).toBe("qux foo foo");
    expect(getFindInNoteState(state)?.activeIndex).toBe(0);
    expect(getFindInNoteState(state)?.matches[0].from).toBe(5);
  });

  it("replace-one reverts in one undo step", () => {
    let state = createFindState("foo foo foo");
    state = applyMeta(state, { type: "open" });
    state = applyMeta(state, { type: "setQuery", query: "foo" });
    state = applyMeta(state, { type: "setReplaceText", replaceText: "qux" });
    state = replaceActiveMatch(state);

    expect(docText(state)).toBe("qux foo foo");

    state = applyUndo(state);
    expect(docText(state)).toBe("foo foo foo");
  });

  it("replace-all applies every match in one undo step", () => {
    let state = createFindState("foo bar foo baz foo");
    state = applyMeta(state, { type: "open" });
    state = applyMeta(state, { type: "setQuery", query: "foo" });
    state = applyMeta(state, { type: "setReplaceText", replaceText: "qux" });
    state = replaceAllMatches(state);

    expect(docText(state)).toBe("qux bar qux baz qux");

    state = applyUndo(state);
    expect(docText(state)).toBe("foo bar foo baz foo");
  });
});
