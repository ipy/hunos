import { markInputRule } from "@tiptap/core";
import { underscoreInputRegex } from "@tiptap/extension-italic";
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
    italic: {},
  },
});

const { doc, paragraph } = schema.nodes;

const italicInputRule = markInputRule({
  find: underscoreInputRegex,
  type: schema.marks.italic,
});

function applyItalicInputRule(markdown: string) {
  const match = underscoreInputRegex.exec(markdown);
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
    italicInputRule.handler as (args: {
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

describe("italic markdown input", () => {
  it("matches _text_ at end of input", () => {
    const match = underscoreInputRegex.exec("_ItalicIter91_");
    expect(match?.[2]).toBe("ItalicIter91");
  });

  it("converts _text_ to an italic mark", () => {
    const tr = applyItalicInputRule("_ItalicIter91_");
    expect(tr.doc.textContent).toBe("ItalicIter91");

    const italicMark = tr.doc.resolve(1).marks();
    expect(italicMark.some((mark) => mark.type.name === "italic")).toBe(true);
  });
});
