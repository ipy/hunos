import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  tryApplyMarkdownLinkAtCursor,
  tryApplyMarkdownLinkOnSpace,
} from "./markdownLinkInputUtils";

const showToast = vi.fn();

vi.mock("@/store/uiStore", () => ({
  useUIStore: {
    getState: () => ({ showToast }),
  },
}));

vi.mock("@/i18n", () => ({
  default: { t: (key: string) => key },
}));

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
  },
  marks: {
    link: {
      attrs: { href: { default: null } },
      inclusive: false,
      parseDOM: [{ tag: "a[href]" }],
      toDOM: (mark) => ["a", { href: mark.attrs.href }, 0],
    },
  },
});

const { doc, paragraph } = schema.nodes;

function editorAtMarkdown(markdown: string) {
  const document = doc.create({}, [
    paragraph.create({}, schema.text(markdown)),
  ]);
  const cursorPos = 1 + markdown.length;
  const state = EditorState.create({
    doc: document,
    schema,
    selection: TextSelection.create(document, cursorPos),
  });
  let nextState = state;
  return {
    state,
    get nextState() {
      return nextState;
    },
    editor: {
      state,
      view: {
        dispatch(tr: typeof state.tr) {
          nextState = state.apply(tr);
        },
      },
    },
  };
}

describe("tryApplyMarkdownLinkOnSpace", () => {
  beforeEach(() => {
    showToast.mockReset();
  });

  it("converts markdown link syntax when Space is pressed", () => {
    const fixture = editorAtMarkdown("[Example](https://example.com)");

    expect(tryApplyMarkdownLinkOnSpace(fixture.editor)).toBe(true);
    expect(fixture.nextState.doc.textContent).toBe("Example ");
    const linkMark = fixture.nextState.doc.firstChild?.firstChild?.marks.find(
      (mark) => mark.type.name === "link",
    );
    expect(linkMark?.attrs.href).toBe("https://example.com");
    expect(showToast).not.toHaveBeenCalled();
  });

  it("shows invalid URL toast and leaves markdown unchanged on Space", () => {
    const fixture = editorAtMarkdown("[Bad link](not a url)");

    expect(tryApplyMarkdownLinkOnSpace(fixture.editor)).toBe(false);
    expect(fixture.nextState.doc.textContent).toBe("[Bad link](not a url)");
    expect(
      fixture.nextState.doc.firstChild?.firstChild?.marks.some(
        (mark) => mark.type.name === "link",
      ),
    ).toBe(false);
    expect(showToast).toHaveBeenCalledWith("editor.link.invalidUrl", "error");
  });
});

describe("tryApplyMarkdownLinkAtCursor", () => {
  beforeEach(() => {
    showToast.mockReset();
  });

  it("shows invalid URL toast and leaves markdown unchanged on Enter", () => {
    const fixture = editorAtMarkdown("[Bad link](not a url)");

    expect(tryApplyMarkdownLinkAtCursor(fixture.editor)).toBe(false);
    expect(fixture.nextState.doc.textContent).toBe("[Bad link](not a url)");
    expect(
      fixture.nextState.doc.firstChild?.firstChild?.marks.some(
        (mark) => mark.type.name === "link",
      ),
    ).toBe(false);
    expect(showToast).toHaveBeenCalledWith("editor.link.invalidUrl", "error");
  });
});
