import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import { buildWikiLinkDecorations } from "./WikiLinkDecoration";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
  },
});

const { doc, paragraph } = schema.nodes;

function inlineDecorationClasses(state: EditorState): string[] {
  const decos = buildWikiLinkDecorations(state);
  const found = decos.find(0, state.doc.content.size);
  return found
    .filter((deco) => deco.inline)
    .map((deco) => {
      const attrs = (deco as { type?: { attrs?: { class?: string } } }).type
        ?.attrs;
      return attrs?.class ?? "";
    });
}

function stateWithWikiCaret(caretOffsetInParagraph: number) {
  const prefix = "用 ";
  const label = "欢迎使用 Hunos";
  const suffix = "。";
  const document = doc.create({}, [
    paragraph.create({}, [
      schema.text(prefix),
      schema.text(`[[${label}]]`),
      schema.text(suffix),
    ]),
  ]);
  return EditorState.create({
    doc: document,
    schema,
    selection: TextSelection.create(document, 1 + caretOffsetInParagraph),
  });
}

describe("buildWikiLinkDecorations", () => {
  it("always hides bracket characters instead of wiki-link-bracket-visible", () => {
    const caretPositions = [
      2, // first [
      3, // second [
      4, // first label char
      13, // last label char
      14, // first ]
      15, // second ]
    ];

    for (const offset of caretPositions) {
      const classes = inlineDecorationClasses(stateWithWikiCaret(offset));
      expect(classes).not.toContain("wiki-link-bracket-visible");
      expect(
        classes.filter((c) => c === "wiki-link-bracket-hidden"),
      ).toHaveLength(2);
    }
  });
});
