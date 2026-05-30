import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/core";
import {
  insertParagraphBetweenHeadingAndList,
  isCaretAtHeadingEndBeforeList,
} from "./headingListBoundaryUtils";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
    heading: {
      group: "block",
      content: "inline*",
      attrs: { level: { default: 2 } },
    },
    bulletList: { content: "listItem+", group: "block" },
    listItem: { content: "paragraph block*", defining: true },
  },
});

const { doc, paragraph, heading, bulletList, listItem } = schema.nodes;

function textNode(value: string) {
  return schema.text(value);
}

function buildListsSectionDoc() {
  return doc.create({}, [
    heading.create({ level: 2 }, textNode("Lists")),
    bulletList.create({}, [
      listItem.create({}, [paragraph.create({}, textNode("无序列表第一项"))]),
    ]),
  ]);
}

function selectionAtHeadingEnd(
  document: ReturnType<typeof buildListsSectionDoc>,
) {
  const headingNode = document.firstChild!;
  let textEnd = 1;
  document.nodesBetween(1, 1 + headingNode.nodeSize, (node, pos) => {
    if (node.isText) {
      textEnd = pos + node.nodeSize;
    }
  });
  return TextSelection.create(document, textEnd);
}

function mockEditor(state: EditorState): Editor {
  const chainApi = {
    focus: vi.fn(function focus() {
      return chainApi;
    }),
    insertContentAt: vi.fn(function insertContentAt() {
      return chainApi;
    }),
    setTextSelection: vi.fn(function setTextSelection() {
      return chainApi;
    }),
    run: vi.fn(() => true),
  };
  return {
    state,
    chain: () => chainApi,
  } as unknown as Editor;
}

describe("heading/list boundary", () => {
  it("detects caret at Lists heading end before bullet list", () => {
    const document = buildListsSectionDoc();
    const state = EditorState.create({
      schema,
      doc: document,
      selection: selectionAtHeadingEnd(document),
    });
    const editor = mockEditor(state);

    expect(isCaretAtHeadingEndBeforeList(editor)).toBe(true);
  });

  it("inserts a gap paragraph at the heading/list junction", () => {
    const document = buildListsSectionDoc();
    const state = EditorState.create({
      schema,
      doc: document,
      selection: selectionAtHeadingEnd(document),
    });
    const editor = mockEditor(state);

    expect(insertParagraphBetweenHeadingAndList(editor)).toBe(true);
    const chain = editor.chain();
    expect(chain.insertContentAt).toHaveBeenCalledWith(expect.any(Number), {
      type: "paragraph",
    });
  });

  it("no-ops when the next block is not a list", () => {
    const document = doc.create({}, [
      heading.create({ level: 2 }, textNode("Lists")),
      paragraph.create({}, textNode("body")),
    ]);
    const state = EditorState.create({
      schema,
      doc: document,
      selection: selectionAtHeadingEnd(document),
    });
    const editor = mockEditor(state);

    expect(isCaretAtHeadingEndBeforeList(editor)).toBe(false);
    expect(insertParagraphBetweenHeadingAndList(editor)).toBe(false);
  });
});
