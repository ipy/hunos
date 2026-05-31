import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import {
  findPlaygroundDocumentH1Pos,
  syncPlaygroundDocumentH1WithTitle,
} from "./playgroundTitleH1Sync";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    heading: {
      attrs: { level: { default: 1 } },
      content: "inline*",
      group: "block",
      defining: true,
    },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
  },
});

const { doc, heading, paragraph } = schema.nodes;

function createMockEditor(document: ReturnType<typeof doc.create>) {
  const state = EditorState.create({
    doc: document,
    schema,
    selection: TextSelection.create(document, 1),
  });
  let lastTr: import("@tiptap/pm/state").Transaction | null = null;
  const editor = {
    state,
    chain: () => {
      const chain = {
        setMeta: () => chain,
        command: (
          fn: (args: { tr: import("@tiptap/pm/state").Transaction }) => boolean,
        ) => {
          const tr = state.tr;
          fn({ tr });
          lastTr = tr;
          return chain;
        },
        run: () => true,
      };
      return chain;
    },
  };
  return {
    editor: editor as unknown as import("@tiptap/react").Editor,
    getLastTr: () => lastTr,
  };
}

describe("playgroundTitleH1Sync", () => {
  it("finds the first H1 in the document", () => {
    const document = doc.create({}, [
      heading.create({ level: 1 }, schema.text("格式试炼场")),
      paragraph.create({}, schema.text("intro")),
      heading.create({ level: 1 }, schema.text("一级标题")),
    ]);
    expect(findPlaygroundDocumentH1Pos(document)).toBe(0);
  });

  it("replaces body H1 when explicitly syncing after restore", () => {
    const document = doc.create({}, [
      heading.create({ level: 1 }, schema.text("格式试炼场")),
      paragraph.create({}, schema.text("intro")),
    ]);
    const { editor, getLastTr } = createMockEditor(document);

    expect(syncPlaygroundDocumentH1WithTitle(editor, "T33-Drift")).toBe(true);
    const tr = getLastTr();
    expect(tr?.doc.firstChild?.textContent).toBe("T33-Drift");
  });

  it("returns false when H1 already matches", () => {
    const document = doc.create({}, [
      heading.create({ level: 1 }, schema.text("格式试炼场")),
    ]);
    const { editor } = createMockEditor(document);
    expect(syncPlaygroundDocumentH1WithTitle(editor, "格式试炼场")).toBe(false);
  });
});
