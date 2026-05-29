import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import {
  buildMarkdownRevealDecorations,
  collectMarkdownRevealSymbolSpecs,
} from "./MarkdownReveal";
import { getMarkRevealSymbols } from "./markdownSymbols";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
  },
  marks: {
    bold: {},
    link: {
      attrs: { href: { default: null } },
      inclusive: false,
      parseDOM: [{ tag: "a[href]" }],
      toDOM: (mark) => ["a", { href: mark.attrs.href }, 0],
    },
  },
});

const { doc, paragraph } = schema.nodes;

function revealedSymbolTexts(state: EditorState): string[] {
  return collectMarkdownRevealSymbolSpecs(state).flatMap((spec) => [
    spec.open,
    spec.close,
  ]);
}

function stateWithLinkParagraph(
  prefix: string,
  label: string,
  suffix: string,
  caretOffsetInParagraph: number,
) {
  const linkMark = schema.marks.link.create({ href: "https://example.com" });
  const document = doc.create({}, [
    paragraph.create({}, [
      schema.text(prefix),
      schema.text(label, [linkMark]),
      schema.text(suffix),
    ]),
  ]);
  const caretPos = 1 + caretOffsetInParagraph;
  return EditorState.create({
    doc: document,
    schema,
    selection: TextSelection.create(document, caretPos),
  });
}

describe("getMarkRevealSymbols", () => {
  it("returns bracket syntax for external links", () => {
    const mark = schema.marks.link.create({ href: "https://example.com" });
    expect(getMarkRevealSymbols("link", mark)).toEqual({
      open: "[",
      close: "](https://example.com)",
    });
  });

  it("returns null for links without href", () => {
    const mark = schema.marks.link.create({ href: null });
    expect(getMarkRevealSymbols("link", mark)).toBeNull();
  });
});

describe("buildMarkdownRevealDecorations", () => {
  it("reveals markdown link delimiters when caret is inside the label", () => {
    const prefix = "详见 ";
    const label = "项目文档";
    const suffix = "。";
    const caretInLabel = prefix.length + 2;
    const state = stateWithLinkParagraph(prefix, label, suffix, caretInLabel);

    expect(revealedSymbolTexts(state)).toEqual(["[", "](https://example.com)"]);
  });

  it("reveals link delimiters at the first character boundary of zh labels", () => {
    const prefix = "详见 ";
    const label = "项目文档";
    const suffix = "。";
    const state = stateWithLinkParagraph(prefix, label, suffix, prefix.length);

    expect(revealedSymbolTexts(state)).toEqual(["[", "](https://example.com)"]);
  });

  it("reveals link delimiters at the last character boundary of zh labels", () => {
    const prefix = "详见 ";
    const label = "项目文档";
    const suffix = "。";
    const state = stateWithLinkParagraph(
      prefix,
      label,
      suffix,
      prefix.length + label.length,
    );

    expect(revealedSymbolTexts(state)).toEqual(["[", "](https://example.com)"]);
  });

  it("reveals link delimiters for English labels", () => {
    const prefix = "See ";
    const label = "project docs";
    const suffix = " for more.";
    const caretInLabel = prefix.length + 3;
    const state = stateWithLinkParagraph(prefix, label, suffix, caretInLabel);

    expect(revealedSymbolTexts(state)).toEqual(["[", "](https://example.com)"]);
  });

  it("reveals link delimiters at English label boundaries", () => {
    const prefix = "See ";
    const label = "project docs";
    const suffix = " for more.";

    const firstChar = stateWithLinkParagraph(
      prefix,
      label,
      suffix,
      prefix.length,
    );
    const lastChar = stateWithLinkParagraph(
      prefix,
      label,
      suffix,
      prefix.length + label.length,
    );

    expect(revealedSymbolTexts(firstChar)).toEqual([
      "[",
      "](https://example.com)",
    ]);
    expect(revealedSymbolTexts(lastChar)).toEqual([
      "[",
      "](https://example.com)",
    ]);
  });

  it("does not reveal link delimiters when caret is outside the link", () => {
    const prefix = "用 ";
    const label = "项目文档";
    const suffix = " #格式测试";
    const caretInPlainText = 1;
    const state = stateWithLinkParagraph(
      prefix,
      label,
      suffix,
      caretInPlainText,
    );

    const texts = revealedSymbolTexts(state);
    expect(texts).not.toContain("[");
    expect(texts.some((text) => text.startsWith("]("))).toBe(false);
  });

  it("does not reveal link delimiters after the link label", () => {
    const prefix = "用 ";
    const label = "项目文档";
    const suffix = " #格式测试";
    const state = stateWithLinkParagraph(
      prefix,
      label,
      suffix,
      prefix.length + label.length + 1,
    );

    const texts = revealedSymbolTexts(state);
    expect(texts).not.toContain("[");
    expect(texts.some((text) => text.startsWith("]("))).toBe(false);
  });

  it("reveals link delimiters once when caret is on a split label boundary", () => {
    const linkMark = schema.marks.link.create({ href: "https://example.com" });
    const prefix = "See ";
    const document = doc.create({}, [
      paragraph.create({}, [
        schema.text(prefix),
        schema.text("pro", [linkMark]),
        schema.text("ject docs", [linkMark]),
        schema.text("."),
      ]),
    ]);
    const caretPos = 1 + prefix.length + 3;
    const state = EditorState.create({
      doc: document,
      schema,
      selection: TextSelection.create(document, caretPos),
    });

    expect(collectMarkdownRevealSymbolSpecs(state)).toHaveLength(1);
    expect(revealedSymbolTexts(state)).toEqual(["[", "](https://example.com)"]);
  });

  it("still reveals other marks when caret is outside a link", () => {
    const linkMark = schema.marks.link.create({ href: "https://example.com" });
    const boldMark = schema.marks.bold.create();
    const document = doc.create({}, [
      paragraph.create({}, [
        schema.text("bold ", [boldMark]),
        schema.text("link", [linkMark]),
      ]),
    ]);
    const caretPos = 3;
    const state = EditorState.create({
      doc: document,
      schema,
      selection: TextSelection.create(document, caretPos),
    });

    expect(revealedSymbolTexts(state)).toEqual(["**", "**"]);
  });

  it("creates widget decorations for each revealed symbol", () => {
    const state = stateWithLinkParagraph("See ", "link", ".", 5);
    const decos = buildMarkdownRevealDecorations(state);
    expect(decos.find(0, state.doc.content.size)).toHaveLength(2);
  });
});
