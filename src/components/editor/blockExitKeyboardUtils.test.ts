import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import type { Editor } from "@tiptap/core";
import {
  findBlockquoteDepth,
  isAtEndOfCodeBlock,
  isEmptyTextblock,
  isLastParagraphInBlockquote,
  isOnEmptyCodeLine,
  shouldExitBlockquoteOnBackspace,
  shouldExitBlockquoteOnEnter,
  shouldExitCodeBlockOnEnter,
  shouldExitCodeBlockOnModEnter,
} from "./blockExitKeyboardUtils";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    blockquote: { content: "block+", group: "block" },
    codeBlock: { content: "text*", group: "block", code: true },
    text: { group: "inline" },
  },
});

const { doc, paragraph, blockquote, codeBlock } = schema.nodes;

function textNode(value: string) {
  return schema.text(value);
}

function selectionAt(document: ReturnType<typeof schema.node>, pos: number) {
  return TextSelection.create(document, pos);
}

function mockEditor(
  activeNodes: string[],
  document: ReturnType<typeof schema.node>,
  pos: number,
): Editor {
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

function buildBlockquoteWithTrailingEmptyLine() {
  return doc.create({}, [
    blockquote.create({}, [
      paragraph.create({}, textNode("quoted text")),
      paragraph.create(),
    ]),
  ]);
}

function buildBlockquoteWithContentOnly() {
  return doc.create({}, [
    blockquote.create({}, [paragraph.create({}, textNode("quoted text"))]),
  ]);
}

function buildCodeBlockWithTrailingEmptyLine() {
  return doc.create({}, [
    codeBlock.create({}, textNode('const x = 1;\n')),
  ]);
}

function buildCodeBlockWithContentAtEnd() {
  return doc.create({}, [
    codeBlock.create({}, textNode('const x = 1;')),
  ]);
}

function findEmptyParagraphPos(document: ReturnType<typeof buildBlockquoteWithTrailingEmptyLine>) {
  let targetPos = -1;
  document.descendants((node, pos) => {
    if (node.type === paragraph && node.textContent === "") {
      targetPos = pos + 1;
    }
    return true;
  });
  if (targetPos < 0) {
    throw new Error("Could not find empty paragraph");
  }
  return targetPos;
}

function findCodeBlockEndPos(document: ReturnType<typeof buildCodeBlockWithTrailingEmptyLine>) {
  let targetPos = -1;
  document.descendants((node, pos) => {
    if (node.type === codeBlock) {
      targetPos = pos + node.nodeSize - 1;
    }
    return true;
  });
  if (targetPos < 0) {
    throw new Error("Could not find code block end");
  }
  return targetPos;
}

describe("isEmptyTextblock", () => {
  it("returns true for empty paragraph", () => {
    const document = buildBlockquoteWithTrailingEmptyLine();
    const pos = findEmptyParagraphPos(document);
    const { $from } = selectionAt(document, pos);
    expect(isEmptyTextblock($from)).toBe(true);
  });

  it("returns false for paragraph with text", () => {
    const document = buildBlockquoteWithContentOnly();
    const { $from } = selectionAt(document, 2);
    expect(isEmptyTextblock($from)).toBe(false);
  });
});

describe("findBlockquoteDepth", () => {
  it("finds blockquote depth for nested paragraph", () => {
    const document = buildBlockquoteWithTrailingEmptyLine();
    const pos = findEmptyParagraphPos(document);
    const { $from } = selectionAt(document, pos);
    expect(findBlockquoteDepth($from)).toBe(1);
  });
});

describe("isLastParagraphInBlockquote", () => {
  it("returns true for trailing empty paragraph", () => {
    const document = buildBlockquoteWithTrailingEmptyLine();
    const pos = findEmptyParagraphPos(document);
    const { $from } = selectionAt(document, pos);
    expect(isLastParagraphInBlockquote($from)).toBe(true);
  });

  it("returns false for only paragraph with content", () => {
    const document = buildBlockquoteWithContentOnly();
    const { $from } = selectionAt(document, 2);
    expect(isLastParagraphInBlockquote($from)).toBe(true);
  });
});

describe("shouldExitBlockquoteOnEnter", () => {
  it("returns true for empty trailing blockquote line (AC1)", () => {
    const document = buildBlockquoteWithTrailingEmptyLine();
    const pos = findEmptyParagraphPos(document);
    const editor = mockEditor(["blockquote"], document, pos);
    expect(shouldExitBlockquoteOnEnter(editor)).toBe(true);
  });

  it("returns false when blockquote line has text (AC2)", () => {
    const document = buildBlockquoteWithContentOnly();
    const editor = mockEditor(["blockquote"], document, 2);
    expect(shouldExitBlockquoteOnEnter(editor)).toBe(false);
  });

  it("returns false outside blockquote", () => {
    const plainDoc = doc.create({}, [paragraph.create({}, textNode("plain"))]);
    const editor = mockEditor(["paragraph"], plainDoc, 1);
    expect(shouldExitBlockquoteOnEnter(editor)).toBe(false);
  });
});

describe("shouldExitBlockquoteOnBackspace", () => {
  it("returns true for empty trailing blockquote line at line start (AC1)", () => {
    const document = buildBlockquoteWithTrailingEmptyLine();
    const pos = findEmptyParagraphPos(document);
    const editor = mockEditor(["blockquote"], document, pos);
    expect(shouldExitBlockquoteOnBackspace(editor)).toBe(true);
  });

  it("returns false when blockquote line has text (AC2 regression guard)", () => {
    const document = buildBlockquoteWithContentOnly();
    const editor = mockEditor(["blockquote"], document, 2);
    expect(shouldExitBlockquoteOnBackspace(editor)).toBe(false);
  });

  it("returns false outside blockquote", () => {
    const plainDoc = doc.create({}, [paragraph.create({}, textNode("plain"))]);
    const editor = mockEditor(["paragraph"], plainDoc, 1);
    expect(shouldExitBlockquoteOnBackspace(editor)).toBe(false);
  });

  it("returns false for empty non-trailing blockquote line", () => {
    const document = doc.create({}, [
      blockquote.create({}, [
        paragraph.create(),
        paragraph.create({}, textNode("second")),
      ]),
    ]);
    const pos = findEmptyParagraphPos(document);
    const editor = mockEditor(["blockquote"], document, pos);
    expect(shouldExitBlockquoteOnBackspace(editor)).toBe(false);
  });
});

describe("isOnEmptyCodeLine", () => {
  it("returns true on trailing empty code line (AC5)", () => {
    const document = buildCodeBlockWithTrailingEmptyLine();
    const pos = findCodeBlockEndPos(document);
    const { $from } = selectionAt(document, pos);
    expect(isOnEmptyCodeLine($from)).toBe(true);
    expect(isAtEndOfCodeBlock($from)).toBe(true);
  });

  it("returns false mid-line with content (AC4)", () => {
    const document = buildCodeBlockWithContentAtEnd();
    const pos = findCodeBlockEndPos(document);
    const { $from } = selectionAt(document, pos);
    expect(isOnEmptyCodeLine($from)).toBe(false);
  });
});

describe("shouldExitCodeBlockOnEnter", () => {
  it("returns true on empty trailing code line (AC5)", () => {
    const document = buildCodeBlockWithTrailingEmptyLine();
    const pos = findCodeBlockEndPos(document);
    const editor = mockEditor(["codeBlock"], document, pos);
    expect(shouldExitCodeBlockOnEnter(editor)).toBe(true);
  });

  it("returns false when current code line has text (AC4)", () => {
    const document = buildCodeBlockWithContentAtEnd();
    const pos = findCodeBlockEndPos(document);
    const editor = mockEditor(["codeBlock"], document, pos);
    expect(shouldExitCodeBlockOnEnter(editor)).toBe(false);
  });
});

describe("shouldExitCodeBlockOnModEnter", () => {
  it("returns true inside code block (AC3)", () => {
    const document = buildCodeBlockWithContentAtEnd();
    const pos = 3;
    const editor = mockEditor(["codeBlock"], document, pos);
    expect(shouldExitCodeBlockOnModEnter(editor)).toBe(true);
  });

  it("returns false in table context (AC9)", () => {
    const document = buildCodeBlockWithContentAtEnd();
    const editor = mockEditor(["codeBlock", "table"], document, 3);
    expect(shouldExitCodeBlockOnModEnter(editor)).toBe(false);
  });

  it("returns false in task item (AC8)", () => {
    const plainDoc = doc.create({}, [paragraph.create({}, textNode("task"))]);
    const editor = mockEditor(["taskItem"], plainDoc, 1);
    expect(shouldExitCodeBlockOnModEnter(editor)).toBe(false);
  });

  it("returns false outside code block", () => {
    const plainDoc = doc.create({}, [paragraph.create({}, textNode("plain"))]);
    const editor = mockEditor(["paragraph"], plainDoc, 1);
    expect(shouldExitCodeBlockOnModEnter(editor)).toBe(false);
  });
});

describe("double-empty Enter flow", () => {
  it("blockquote empty trailing line resolves to exit after first empty line", () => {
    const document = buildBlockquoteWithTrailingEmptyLine();
    const pos = findEmptyParagraphPos(document);
    const editor = mockEditor(["blockquote"], document, pos);
    expect(shouldExitBlockquoteOnEnter(editor)).toBe(true);
  });
});
