import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import {
  applyMarkdownLinkInputRule,
  findMarkdownLinkInputMatch,
  MARKDOWN_LINK_INPUT_REGEX,
} from "./markdownLinkUtils";

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

function markdownLinkState(markdown: string) {
  const document = doc.create({}, [
    paragraph.create({}, schema.text(markdown)),
  ]);
  const cursorPos = 1 + markdown.length;
  const match = MARKDOWN_LINK_INPUT_REGEX.exec(markdown);
  expect(match).not.toBeNull();
  const range = {
    from: cursorPos - match![0].length,
    to: cursorPos,
  };
  const state = EditorState.create({
    doc: document,
    schema,
    selection: TextSelection.create(document, cursorPos),
  });
  return { state, range, match: match! };
}

describe("findMarkdownLinkInputMatch", () => {
  it("matches markdown link syntax at end of text", () => {
    const match = findMarkdownLinkInputMatch(
      "[Example Site](https://example.com)",
    );
    expect(match?.[1]).toBe("Example Site");
    expect(match?.[2]).toBe("https://example.com");
  });

  it("ignores incomplete markdown links", () => {
    expect(findMarkdownLinkInputMatch("[Example Site](https://")).toBeNull();
  });
});

describe("applyMarkdownLinkInputRule", () => {
  it("replaces markdown syntax with a link mark on the label", () => {
    const { state, range, match } = markdownLinkState(
      "[Example Site](https://example.com)",
    );
    const next = applyMarkdownLinkInputRule(state, range, match);

    expect(next).not.toBeNull();
    expect(next!.doc.textContent).toBe("Example Site");
    const linkMark = next!.doc.firstChild?.firstChild?.marks.find(
      (mark) => mark.type.name === "link",
    );
    expect(linkMark?.attrs.href).toBe("https://example.com");
  });

  it("normalizes bare domains", () => {
    const { state, range, match } = markdownLinkState(
      "[Docs](docs.example.com)",
    );
    const next = applyMarkdownLinkInputRule(state, range, match);

    expect(next).not.toBeNull();
    const linkMark = next!.doc.firstChild?.firstChild?.marks.find(
      (mark) => mark.type.name === "link",
    );
    expect(linkMark?.attrs.href).toBe("https://docs.example.com");
  });

  it("leaves invalid URLs unchanged", () => {
    const { state, range, match } = markdownLinkState("[Bad](not a url)");
    const next = applyMarkdownLinkInputRule(state, range, match);
    expect(next).toBeNull();
    expect(state.doc.textContent).toBe("[Bad](not a url)");
  });

  it("does not apply inside code blocks", () => {
    const markdown = "[Example](https://example.com)";
    const document = doc.create({}, [
      codeBlock.create({}, schema.text(markdown)),
    ]);
    const cursorPos = 1 + markdown.length;
    const match = MARKDOWN_LINK_INPUT_REGEX.exec(markdown)!;
    const range = {
      from: cursorPos - match[0].length,
      to: cursorPos,
    };
    const state = EditorState.create({ doc: document, schema });
    const next = applyMarkdownLinkInputRule(state, range, match);
    expect(next).toBeNull();
  });
});
