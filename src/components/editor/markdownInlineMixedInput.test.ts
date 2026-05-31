import { markInputRule } from "@tiptap/core";
import { starInputRegex as boldStarInputRegex } from "@tiptap/extension-bold";
import { starInputRegex as italicStarInputRegex } from "@tiptap/extension-italic";
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
    bold: {},
    italic: {},
    code: {},
  },
});

const { doc, paragraph } = schema.nodes;

function applyMarkInputRule(
  markdown: string,
  regex: RegExp,
  markName: "bold" | "italic" | "code",
) {
  const match = regex.exec(markdown);
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
  const rule = markInputRule({
    find: regex,
    type: schema.marks[markName]!,
  });

  (
    rule.handler as (args: {
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

describe("mixed inline markdown input (AC31-mixed-markdown)", () => {
  it("converts bold, italic star, and code segments on one line", () => {
    const prefix = "UX测试：混排 ";
    let tr = applyMarkInputRule(
      `${prefix}**粗体**`,
      boldStarInputRegex,
      "bold",
    );
    expect(tr.doc.textContent).toBe(`${prefix}粗体`);

    tr = applyMarkInputRule(
      `${prefix}粗体 与 *斜体*`,
      italicStarInputRegex,
      "italic",
    );
    expect(tr.doc.textContent).toBe(`${prefix}粗体 与 斜体`);

    tr = applyMarkInputRule(
      `${prefix}粗体 与 斜体 以及 \`代码\``,
      codeInputRegex,
      "code",
    );
    expect(tr.doc.textContent).toBe(`${prefix}粗体 与 斜体 以及 代码`);
  });
});
