import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import { isAutolinkRangeBlocked, shouldAutolinkUrl } from "./linkAutolinkUtils";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
    codeBlock: { content: "text*", group: "block", code: true },
  },
  marks: {
    code: {},
    link: {
      attrs: { href: { default: null } },
      inclusive: false,
      parseDOM: [{ tag: "a[href]" }],
      toDOM: (mark) => ["a", { href: mark.attrs.href }, 0],
    },
  },
});

const { doc, paragraph, codeBlock } = schema.nodes;

describe("shouldAutolinkUrl", () => {
  it("allows http and https URLs", () => {
    expect(shouldAutolinkUrl("https://hunos.dev")).toBe(true);
    expect(shouldAutolinkUrl("http://example.com")).toBe(true);
  });

  it("rejects hash-prefixed tokens", () => {
    expect(shouldAutolinkUrl("#format-test")).toBe(false);
  });
});

describe("isAutolinkRangeBlocked", () => {
  it("blocks autolink inside code blocks", () => {
    const document = doc.create({}, [
      codeBlock.create({}, schema.text("https://example.com")),
    ]);
    const state = EditorState.create({ doc: document, schema });
    expect(isAutolinkRangeBlocked(state, 1, 20)).toBe(true);
  });

  it("blocks autolink inside inline code marks", () => {
    const document = doc.create({}, [
      paragraph.create(
        {},
        schema.text("https://example.com", [schema.marks.code.create()]),
      ),
    ]);
    const state = EditorState.create({ doc: document, schema });
    expect(isAutolinkRangeBlocked(state, 1, 20)).toBe(true);
  });

  it("blocks autolink inside wiki-link spans", () => {
    const document = doc.create({}, [
      paragraph.create({}, schema.text("See [[Welcome]] notes")),
    ]);
    const state = EditorState.create({ doc: document, schema });
    expect(isAutolinkRangeBlocked(state, 5, 16)).toBe(true);
  });

  it("blocks autolink overlapping tag tokens", () => {
    const document = doc.create({}, [
      paragraph.create({}, schema.text("Use #format-test here")),
    ]);
    const state = EditorState.create({ doc: document, schema });
    expect(isAutolinkRangeBlocked(state, 5, 17)).toBe(true);
  });

  it("allows autolink in plain paragraphs", () => {
    const document = doc.create({}, [
      paragraph.create({}, schema.text("Visit https://hunos.dev today")),
    ]);
    const state = EditorState.create({
      doc: document,
      schema,
      selection: TextSelection.create(document, 7),
    });
    expect(isAutolinkRangeBlocked(state, 7, 22)).toBe(false);
  });
});
