import { markInputRule } from "@tiptap/core";
import { starInputRegex } from "@tiptap/extension-bold";
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
    bold: {},
  },
});

const { doc, paragraph } = schema.nodes;

const boldInputRule = markInputRule({
  find: starInputRegex,
  type: schema.marks.bold,
});

function applyBoldInputRule(markdown: string) {
  const match = starInputRegex.exec(markdown);
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
    boldInputRule.handler as (args: {
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

describe("bold markdown input", () => {
  it("matches **text** at end of input", () => {
    const match = starInputRegex.exec("**BoldIter99**");
    expect(match?.[2]).toBe("BoldIter99");
  });

  it("converts **text** to a bold mark", () => {
    const tr = applyBoldInputRule("**BoldIter99**");
    expect(tr.doc.textContent).toBe("BoldIter99");

    const boldMark = tr.doc.resolve(1).marks();
    expect(boldMark.some((mark) => mark.type.name === "bold")).toBe(true);
  });
});
