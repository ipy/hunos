import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import type { Editor } from "@tiptap/core";
import {
  findListItemDepth,
  isAtListItemStart,
  isListItemEmpty,
  isNestedListItem,
} from "./listOutlineUtils";
import {
  resolveBackspaceStartAction,
  resolveEmptyEnterAction,
} from "./listKeyboardUtils";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
    bulletList: { content: "listItem+", group: "block" },
    listItem: { content: "paragraph block*", defining: true },
  },
});

const { doc, paragraph, bulletList, listItem } = schema.nodes;

function textNode(value: string) {
  return schema.text(value);
}

function buildFlatBulletDoc() {
  return doc.create({}, [
    bulletList.create({}, [
      listItem.create({}, [
        paragraph.create({}, textNode("one")),
      ]),
      listItem.create({}, [paragraph.create()]),
    ]),
  ]);
}

function buildNestedEmptyDoc() {
  return doc.create({}, [
    bulletList.create({}, [
      listItem.create({}, [
        paragraph.create({}, textNode("parent")),
        bulletList.create({}, [
          listItem.create({}, [paragraph.create()]),
        ]),
      ]),
    ]),
  ]);
}

function buildNestedWithTextDoc() {
  return doc.create({}, [
    bulletList.create({}, [
      listItem.create({}, [
        paragraph.create({}, textNode("parent")),
        bulletList.create({}, [
          listItem.create({}, [
            paragraph.create({}, textNode("nested")),
          ]),
        ]),
      ]),
    ]),
  ]);
}

function findTopLevelItemParagraphPos(
  document: ReturnType<typeof buildFlatBulletDoc>,
  itemIndex: number,
) {
  let targetPos = -1;
  let topIndex = -1;

  document.descendants((node, pos) => {
    if (node.type !== listItem) {
      return true;
    }

    const $pos = document.resolve(pos + 1);
    if (isNestedListItem($pos, "listItem")) {
      return true;
    }

    topIndex += 1;
    if (topIndex === itemIndex && node.firstChild?.type === paragraph) {
      targetPos = pos + 1;
    }
    return true;
  });

  if (targetPos < 0) {
    throw new Error(`Could not find top-level paragraph for item index ${itemIndex}`);
  }
  return targetPos;
}

function findNestedEmptyParagraphPos(document: ReturnType<typeof buildNestedEmptyDoc>) {
  let targetPos = -1;

  document.descendants((node, pos) => {
    if (node.type !== listItem || node.textContent !== "") {
      return true;
    }

    const $pos = document.resolve(pos + 1);
    if (isNestedListItem($pos, "listItem")) {
      targetPos = pos + 1;
      return false;
    }
    return true;
  });

  if (targetPos < 0) {
    throw new Error("Could not find nested empty paragraph");
  }
  return targetPos;
}

function findNestedTextPos(
  document: ReturnType<typeof buildNestedWithTextDoc>,
  offsetInText: number,
) {
  let targetPos = -1;

  document.descendants((node, pos) => {
    if (node.type === paragraph && node.textContent === "nested") {
      targetPos = pos + 1 + offsetInText;
    }
    return true;
  });

  if (targetPos < 0) {
    throw new Error("Could not find nested text position");
  }
  return targetPos;
}

function selectionAt(document: ReturnType<typeof buildFlatBulletDoc>, pos: number) {
  return TextSelection.create(document, pos);
}

function mockEditor(activeNodes: string[], document: ReturnType<typeof buildFlatBulletDoc>, pos: number): Editor {
  const state = EditorState.create({
    doc: document,
    schema,
    selection: selectionAt(document, pos),
  });
  return {
    isActive: (name: string) => activeNodes.includes(name),
    state,
  } as Editor;
}

describe("findListItemDepth", () => {
  it("finds top-level list item depth", () => {
    const document = buildFlatBulletDoc();
    const pos = findTopLevelItemParagraphPos(document, 0);
    const { $from } = selectionAt(document, pos);
    expect(findListItemDepth($from, "listItem")).toBe(2);
  });

  it("finds nested list item depth", () => {
    const document = buildNestedEmptyDoc();
    const pos = findNestedEmptyParagraphPos(document);
    const { $from } = selectionAt(document, pos);
    expect(findListItemDepth($from, "listItem")).toBe(4);
  });
});

describe("isListItemEmpty", () => {
  it("returns true for empty top-level item", () => {
    const document = buildFlatBulletDoc();
    const pos = findTopLevelItemParagraphPos(document, 1);
    const { $from } = selectionAt(document, pos);
    expect(isListItemEmpty($from, "listItem")).toBe(true);
  });

  it("returns false for non-empty item", () => {
    const document = buildFlatBulletDoc();
    const pos = findTopLevelItemParagraphPos(document, 0);
    const { $from } = selectionAt(document, pos);
    expect(isListItemEmpty($from, "listItem")).toBe(false);
  });

  it("returns true for empty nested item", () => {
    const document = buildNestedEmptyDoc();
    const pos = findNestedEmptyParagraphPos(document);
    const { $from } = selectionAt(document, pos);
    expect(isListItemEmpty($from, "listItem")).toBe(true);
  });
});

describe("isNestedListItem", () => {
  it("returns false for top-level item", () => {
    const document = buildFlatBulletDoc();
    const pos = findTopLevelItemParagraphPos(document, 1);
    const { $from } = selectionAt(document, pos);
    expect(isNestedListItem($from, "listItem")).toBe(false);
  });

  it("returns true for nested item", () => {
    const document = buildNestedEmptyDoc();
    const pos = findNestedEmptyParagraphPos(document);
    const { $from } = selectionAt(document, pos);
    expect(isNestedListItem($from, "listItem")).toBe(true);
  });
});

describe("isAtListItemStart", () => {
  it("returns true at start of empty nested item", () => {
    const document = buildNestedEmptyDoc();
    const pos = findNestedEmptyParagraphPos(document);
    const { $from } = selectionAt(document, pos);
    expect(isAtListItemStart($from, "listItem")).toBe(true);
  });

  it("returns true at start of non-empty nested item", () => {
    const document = buildNestedWithTextDoc();
    const pos = findNestedTextPos(document, 0);
    const { $from } = selectionAt(document, pos);
    expect(isAtListItemStart($from, "listItem")).toBe(true);
  });

  it("returns false in the middle of item text", () => {
    const document = buildNestedWithTextDoc();
    const pos = findNestedTextPos(document, 2);
    const { $from } = selectionAt(document, pos);
    expect(isAtListItemStart($from, "listItem")).toBe(false);
  });
});

describe("resolveEmptyEnterAction", () => {
  it("returns exit for empty top-level bullet", () => {
    const document = buildFlatBulletDoc();
    const pos = findTopLevelItemParagraphPos(document, 1);
    const editor = mockEditor(["listItem", "bulletList"], document, pos);
    expect(resolveEmptyEnterAction(editor)).toBe("exit");
  });

  it("returns outdent for empty nested bullet", () => {
    const document = buildNestedEmptyDoc();
    const pos = findNestedEmptyParagraphPos(document);
    const editor = mockEditor(["listItem", "bulletList"], document, pos);
    expect(resolveEmptyEnterAction(editor)).toBe("outdent");
  });

  it("returns null for non-empty item", () => {
    const document = buildFlatBulletDoc();
    const pos = findTopLevelItemParagraphPos(document, 0);
    const editor = mockEditor(["listItem", "bulletList"], document, pos);
    expect(resolveEmptyEnterAction(editor)).toBeNull();
  });

  it("returns null outside list items", () => {
    const plainDoc = doc.create({}, [paragraph.create({}, textNode("plain"))]);
    const editor = mockEditor(["paragraph"], plainDoc, 1);
    expect(resolveEmptyEnterAction(editor)).toBeNull();
  });

  it("returns null in blocked contexts", () => {
    const document = buildFlatBulletDoc();
    const pos = findTopLevelItemParagraphPos(document, 1);
    const editor = mockEditor(["listItem", "codeBlock"], document, pos);
    expect(resolveEmptyEnterAction(editor)).toBeNull();
  });
});

describe("resolveBackspaceStartAction", () => {
  it("returns exit for empty top-level item at line start", () => {
    const document = buildFlatBulletDoc();
    const pos = findTopLevelItemParagraphPos(document, 1);
    const editor = mockEditor(["listItem", "bulletList"], document, pos);
    expect(resolveBackspaceStartAction(editor)).toBe("exit");
  });

  it("returns outdent for empty nested item at line start", () => {
    const document = buildNestedEmptyDoc();
    const pos = findNestedEmptyParagraphPos(document);
    const editor = mockEditor(["listItem", "bulletList"], document, pos);
    expect(resolveBackspaceStartAction(editor)).toBe("outdent");
  });

  it("returns outdent for non-empty nested item at line start", () => {
    const document = buildNestedWithTextDoc();
    const pos = findNestedTextPos(document, 0);
    const editor = mockEditor(["listItem", "bulletList"], document, pos);
    expect(resolveBackspaceStartAction(editor)).toBe("outdent");
  });

  it("returns null for top-level non-empty item at line start", () => {
    const document = buildFlatBulletDoc();
    const pos = findTopLevelItemParagraphPos(document, 0);
    const editor = mockEditor(["listItem", "bulletList"], document, pos);
    expect(resolveBackspaceStartAction(editor)).toBeNull();
  });

  it("returns null when caret is not at line start", () => {
    const document = buildNestedWithTextDoc();
    const pos = findNestedTextPos(document, 2);
    const editor = mockEditor(["listItem", "bulletList"], document, pos);
    expect(resolveBackspaceStartAction(editor)).toBeNull();
  });
});

describe("double-empty Enter flow", () => {
  it("nested empty resolves to outdent before top-level exit", () => {
    const document = buildNestedEmptyDoc();
    const pos = findNestedEmptyParagraphPos(document);
    const editor = mockEditor(["listItem", "bulletList"], document, pos);
    expect(resolveEmptyEnterAction(editor)).toBe("outdent");
  });

  it("top-level empty resolves to exit after outdenting", () => {
    const document = buildFlatBulletDoc();
    const pos = findTopLevelItemParagraphPos(document, 1);
    const editor = mockEditor(["listItem", "bulletList"], document, pos);
    expect(resolveEmptyEnterAction(editor)).toBe("exit");
  });
});
