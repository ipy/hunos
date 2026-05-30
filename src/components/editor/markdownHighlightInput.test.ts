import { markInputRule } from "@tiptap/core";
import { inputRegex as highlightInputRegex } from "@tiptap/extension-highlight";
import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
  },
  marks: {
    highlight: {},
  },
});

const { doc, paragraph } = schema.nodes;

const highlightInputRule = markInputRule({
  find: highlightInputRegex,
  type: schema.marks.highlight,
});

function applyHighlightInputRule(markdown: string) {
  const match = highlightInputRegex.exec(markdown);
  expect(match).not.toBeNull();

  const document = doc.create({}, [
    paragraph.create({}, schema.text(markdown)),
  ]);
  const cursorPos = 1 + markdown.length;
  const range = {
    from: cursorPos - match![0].length,
    to: cursorPos,
  };
  const state = EditorState.create({
    doc: document,
    schema,
    selection: TextSelection.create(document, cursorPos),
  });
  const tr = state.tr;

  (
    highlightInputRule.handler as (args: {
      state: EditorState;
      range: { from: number; to: number };
      match: RegExpExecArray;
    }) => void
  )({
    state: { tr, doc: state.doc, schema: state.schema } as EditorState,
    range,
    match: match!,
  });

  return tr;
}

describe("highlight markdown input", () => {
  it("matches ==text== at end of input", () => {
    const match = highlightInputRegex.exec("==HighlightIter89==");
    expect(match?.[2]).toBe("HighlightIter89");
  });

  it("converts ==text== to a highlight mark", () => {
    const tr = applyHighlightInputRule("==HighlightIter89==");
    expect(tr.doc.textContent).toBe("HighlightIter89");

    const highlightMark = tr.doc.resolve(1).marks();
    expect(highlightMark.some((mark) => mark.type.name === "highlight")).toBe(
      true,
    );
  });
});
