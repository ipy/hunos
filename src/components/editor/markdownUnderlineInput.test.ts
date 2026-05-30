import { markInputRule } from "@tiptap/core";
import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import { UNDERLINE_INPUT_REGEX } from "./MarkdownShortcuts";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
  },
  marks: {
    underline: {},
  },
});

const { doc, paragraph } = schema.nodes;

const underlineInputRule = markInputRule({
  find: UNDERLINE_INPUT_REGEX,
  type: schema.marks.underline,
});

function applyUnderlineInputRule(markdown: string) {
  const match = UNDERLINE_INPUT_REGEX.exec(markdown);
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
    underlineInputRule.handler as (args: {
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

describe("underline markdown input", () => {
  it("matches __text__ at end of input", () => {
    const match = UNDERLINE_INPUT_REGEX.exec("__UnderlineIter99__");
    expect(match?.[2]).toBe("UnderlineIter99");
  });

  it("converts __text__ to an underline mark", () => {
    const tr = applyUnderlineInputRule("__UnderlineIter99__");
    expect(tr.doc.textContent).toBe("UnderlineIter99");

    const underlineMark = tr.doc.resolve(1).marks();
    expect(underlineMark.some((mark) => mark.type.name === "underline")).toBe(
      true,
    );
  });
});
