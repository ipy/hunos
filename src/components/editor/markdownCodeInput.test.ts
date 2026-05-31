import { markInputRule } from "@tiptap/core";
import { inputRegex as codeInputRegex } from "@tiptap/extension-code";
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
    code: {},
  },
});

const { doc, paragraph } = schema.nodes;

const codeInputRule = markInputRule({
  find: codeInputRegex,
  type: schema.marks.code,
});

function applyCodeInputRule(markdown: string) {
  const match = codeInputRegex.exec(markdown);
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
    codeInputRule.handler as (args: {
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

describe("code markdown input", () => {
  it("matches `text` at end of input", () => {
    const match = codeInputRegex.exec("`CodeIter91`");
    expect(match?.[2]).toBe("CodeIter91");
  });

  it("converts `text` to a code mark", () => {
    const tr = applyCodeInputRule("`CodeIter91`");
    expect(tr.doc.textContent).toBe("CodeIter91");

    const codeMark = tr.doc.resolve(1).marks();
    expect(codeMark.some((mark) => mark.type.name === "code")).toBe(true);
  });

  it("converts T10-code-sample via backticks", () => {
    const tr = applyCodeInputRule("`T10-code-sample`");
    expect(tr.doc.textContent).toBe("T10-code-sample");
    expect(
      tr.doc
        .resolve(1)
        .marks()
        .some((mark) => mark.type.name === "code"),
    ).toBe(true);
  });
});
