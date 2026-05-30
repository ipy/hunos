import { markInputRule } from "@tiptap/core";
import { inputRegex as strikeInputRegex } from "@tiptap/extension-strike";
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
    strike: {},
  },
});

const { doc, paragraph } = schema.nodes;

const strikeInputRule = markInputRule({
  find: strikeInputRegex,
  type: schema.marks.strike,
});

function applyStrikeInputRule(markdown: string) {
  const match = strikeInputRegex.exec(markdown);
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
    strikeInputRule.handler as (args: {
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

describe("strike markdown input", () => {
  it("matches ~~text~~ at end of input", () => {
    const match = strikeInputRegex.exec("~~StrikeIter88~~");
    expect(match?.[2]).toBe("StrikeIter88");
  });

  it("converts ~~text~~ to a strike mark", () => {
    const tr = applyStrikeInputRule("~~StrikeIter88~~");
    expect(tr.doc.textContent).toBe("StrikeIter88");

    const strikeMark = tr.doc.resolve(1).marks();
    expect(strikeMark.some((mark) => mark.type.name === "strike")).toBe(true);
  });
});
