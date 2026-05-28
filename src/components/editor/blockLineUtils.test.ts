import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import {
  buildDeleteLineTransaction,
  buildDuplicateLineTransaction,
  getDeletableBlockRange,
  getDuplicatableBlockRange,
  getLineBlockRange,
} from "./blockLineUtils";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    heading: {
      group: "block",
      content: "inline*",
      attrs: { level: { default: 1 } },
    },
    text: { group: "inline" },
    bulletList: { content: "listItem+", group: "block" },
    orderedList: { content: "listItem+", group: "block" },
    taskList: { content: "taskItem+", group: "block" },
    listItem: { content: "paragraph block*", defining: true },
    taskItem: {
      content: "paragraph block*",
      defining: true,
      attrs: { checked: { default: false } },
    },
    blockquote: { content: "block+", group: "block" },
    codeBlock: { content: "text*", group: "block" },
    horizontalRule: { group: "block" },
    table: { content: "tableRow+", group: "block" },
    tableRow: { content: "(tableCell | tableHeader)+" },
    tableCell: { content: "block+", isolating: true },
    tableHeader: { content: "block+", isolating: true },
  },
});

const {
  doc,
  paragraph,
  heading,
  bulletList,
  orderedList,
  taskList,
  listItem,
  taskItem,
  blockquote,
  codeBlock,
  horizontalRule,
  table,
  tableRow,
  tableCell,
} = schema.nodes;

function textNode(value: string) {
  return schema.text(value);
}

function buildThreeBulletDoc() {
  return doc.create({}, [
    bulletList.create({}, [
      listItem.create({}, [paragraph.create({}, textNode("one"))]),
      listItem.create({}, [paragraph.create({}, textNode("two"))]),
      listItem.create({}, [paragraph.create({}, textNode("three"))]),
    ]),
  ]);
}

function buildOrderedDoc() {
  return doc.create({}, [
    orderedList.create({}, [
      listItem.create({}, [paragraph.create({}, textNode("first"))]),
      listItem.create({}, [paragraph.create({}, textNode("second"))]),
      listItem.create({}, [paragraph.create({}, textNode("third"))]),
    ]),
  ]);
}

function buildTaskDoc() {
  return doc.create({}, [
    taskList.create({}, [
      taskItem.create({ checked: false }, [
        paragraph.create({}, textNode("open")),
      ]),
      taskItem.create({ checked: true }, [
        paragraph.create({}, textNode("done")),
      ]),
    ]),
  ]);
}

function buildNestedDoc() {
  return doc.create({}, [
    bulletList.create({}, [
      listItem.create({}, [
        paragraph.create({}, textNode("one")),
        bulletList.create({}, [
          listItem.create({}, [paragraph.create({}, textNode("two"))]),
        ]),
      ]),
      listItem.create({}, [paragraph.create({}, textNode("three"))]),
    ]),
  ]);
}

function buildParagraphDoc(labels: string[]) {
  return doc.create(
    {},
    labels.map((label) => paragraph.create({}, textNode(label))),
  );
}

function buildHeadingSectionDoc() {
  return doc.create({}, [
    heading.create({ level: 2 }, textNode("Inline Marks")),
    paragraph.create({}, textNode("inline body")),
    heading.create({ level: 2 }, textNode("Lists")),
    bulletList.create({}, [
      listItem.create({}, [paragraph.create({}, textNode("item"))]),
    ]),
  ]);
}

function buildBlockquoteDoc() {
  return doc.create({}, [
    blockquote.create({}, [paragraph.create({}, textNode("quote"))]),
  ]);
}

function findTextPos(
  document: ReturnType<typeof buildThreeBulletDoc>,
  text: string,
) {
  let targetPos = -1;
  document.descendants((node, pos) => {
    if (node.isText && node.text === text) {
      targetPos = pos + 1;
    }
    return true;
  });
  if (targetPos < 0) {
    throw new Error(`Could not find text "${text}"`);
  }
  return targetPos;
}

function stateAt(
  document: ReturnType<typeof buildThreeBulletDoc>,
  pos: number,
) {
  return EditorState.create({
    doc: document,
    schema,
    selection: TextSelection.create(document, pos),
  });
}

function applyDuplicate(
  document: ReturnType<typeof buildThreeBulletDoc>,
  pos: number,
) {
  const state = stateAt(document, pos);
  const tr = buildDuplicateLineTransaction(state);
  expect(tr).not.toBeNull();
  return { doc: tr!.doc, selection: tr!.selection };
}

function applyDelete(
  document: ReturnType<typeof buildThreeBulletDoc>,
  pos: number,
) {
  const state = stateAt(document, pos);
  const tr = buildDeleteLineTransaction(state);
  expect(tr).not.toBeNull();
  return tr!.doc;
}

function listItemTexts(document: ReturnType<typeof buildThreeBulletDoc>) {
  const items: string[] = [];
  document.descendants((node) => {
    if (node.type === listItem || node.type === taskItem) {
      items.push(node.textContent);
    }
    return true;
  });
  return items;
}

describe("getLineBlockRange", () => {
  it("returns list item range for bullet caret", () => {
    const document = buildThreeBulletDoc();
    const pos = findTextPos(document, "two");
    const range = getLineBlockRange(document.resolve(pos));
    expect(range).not.toBeNull();
    expect(document.textBetween(range!.from, range!.to)).toBe("two");
  });

  it("returns heading-only range, not section body", () => {
    const document = buildHeadingSectionDoc();
    const pos = findTextPos(document, "Lists");
    const range = getLineBlockRange(document.resolve(pos))!;
    expect(document.textBetween(range.from, range.to)).toBe("Lists");
    expect(document.childCount).toBe(4);
  });

  it("returns blockquote for single-paragraph quote", () => {
    const document = buildBlockquoteDoc();
    const pos = findTextPos(document, "quote");
    const range = getLineBlockRange(document.resolve(pos))!;
    expect(document.nodeAt(range.from)?.type.name).toBe("blockquote");
  });

  it("returns null inside table cells", () => {
    const document = doc.create({}, [
      table.create({}, [
        tableRow.create({}, [
          tableCell.create({}, [paragraph.create({}, textNode("cell"))]),
        ]),
      ]),
    ]);
    const pos = findTextPos(document, "cell");
    expect(getLineBlockRange(document.resolve(pos))).toBeNull();
  });

  it("exposes duplicatable and deletable aliases", () => {
    const document = buildThreeBulletDoc();
    const $from = document.resolve(findTextPos(document, "two"));
    expect(getDuplicatableBlockRange($from)).toEqual(getLineBlockRange($from));
    expect(getDeletableBlockRange($from)).toEqual(getLineBlockRange($from));
  });
});

describe("buildDuplicateLineTransaction", () => {
  it("duplicates second bullet below original (AC1)", () => {
    const document = buildThreeBulletDoc();
    const pos = findTextPos(document, "two");
    const { doc: nextDoc } = applyDuplicate(document, pos);
    expect(listItemTexts(nextDoc)).toEqual(["one", "two", "two", "three"]);
    expect(nextDoc.child(0).type.name).toBe("bulletList");
    expect(nextDoc.child(0).childCount).toBe(4);
  });

  it("duplicates ordered item with correct sibling order (AC2)", () => {
    const document = buildOrderedDoc();
    const pos = findTextPos(document, "second");
    const { doc: nextDoc } = applyDuplicate(document, pos);
    expect(listItemTexts(nextDoc)).toEqual([
      "first",
      "second",
      "second",
      "third",
    ]);
  });

  it("duplicates nested list item preserving depth (AC3)", () => {
    const document = buildNestedDoc();
    const pos = findTextPos(document, "two");
    const { doc: nextDoc } = applyDuplicate(document, pos);
    const nested = nextDoc.child(0).child(0).child(1);
    expect(nested.type.name).toBe("bulletList");
    expect(nested.childCount).toBe(2);
    expect(nested.child(0).textContent).toBe("two");
    expect(nested.child(1).textContent).toBe("two");
  });

  it("duplicates task item with matching checkbox state (AC4)", () => {
    const document = buildTaskDoc();
    const pos = findTextPos(document, "open");
    const { doc: nextDoc } = applyDuplicate(document, pos);
    expect(listItemTexts(nextDoc)).toEqual(["open", "open", "done"]);

    const checked: boolean[] = [];
    nextDoc.descendants((node) => {
      if (node.type === taskItem) {
        checked.push(Boolean(node.attrs.checked));
      }
      return true;
    });
    expect(checked).toEqual([false, false, true]);
  });

  it("duplicates paragraph between neighbors (AC5)", () => {
    const document = buildParagraphDoc(["A", "B", "C"]);
    const pos = findTextPos(document, "B");
    const { doc: nextDoc, selection } = applyDuplicate(document, pos);
    expect(nextDoc.textContent).toBe("ABBC");
    const $from = nextDoc.resolve(selection.from);
    expect($from.parent.textContent).toBe("B");
    expect($from.index($from.depth - 1)).toBe(2);
  });

  it("duplicates only heading node, not section body (AC6)", () => {
    const document = buildHeadingSectionDoc();
    const pos = findTextPos(document, "Lists");
    const { doc: nextDoc } = applyDuplicate(document, pos);
    expect(nextDoc.child(0).textContent).toBe("Inline Marks");
    expect(nextDoc.child(1).textContent).toBe("inline body");
    expect(nextDoc.child(2).textContent).toBe("Lists");
    expect(nextDoc.child(3).textContent).toBe("Lists");
    expect(nextDoc.child(4).type.name).toBe("bulletList");
  });

  it("duplicates blockquote as sibling block (AC7)", () => {
    const document = buildBlockquoteDoc();
    const pos = findTextPos(document, "quote");
    const { doc: nextDoc } = applyDuplicate(document, pos);
    expect(nextDoc.childCount).toBe(2);
    expect(nextDoc.child(0).type.name).toBe("blockquote");
    expect(nextDoc.child(1).type.name).toBe("blockquote");
    expect(nextDoc.child(0).textContent).toBe("quote");
    expect(nextDoc.child(1).textContent).toBe("quote");
  });

  it("duplicates entire code block (AC8)", () => {
    const document = doc.create({}, [
      codeBlock.create({}, textNode('const x = "y";')),
    ]);
    const pos = findTextPos(document, 'const x = "y";');
    const { doc: nextDoc } = applyDuplicate(document, pos);
    expect(nextDoc.childCount).toBe(2);
    expect(nextDoc.child(0).textContent).toBe('const x = "y";');
    expect(nextDoc.child(1).textContent).toBe('const x = "y";');
  });

  it("no-ops duplicate inside table cell (AC14)", () => {
    const document = doc.create({}, [
      table.create({}, [
        tableRow.create({}, [
          tableCell.create({}, [paragraph.create({}, textNode("cell"))]),
        ]),
      ]),
    ]);
    const pos = findTextPos(document, "cell");
    expect(buildDuplicateLineTransaction(stateAt(document, pos))).toBeNull();
  });
});

describe("buildDeleteLineTransaction", () => {
  it("removes second bullet item (AC9)", () => {
    const document = buildThreeBulletDoc();
    const pos = findTextPos(document, "two");
    const nextDoc = applyDelete(document, pos);
    expect(listItemTexts(nextDoc)).toEqual(["one", "three"]);
  });

  it("removes completed task row (AC10)", () => {
    const document = buildTaskDoc();
    const pos = findTextPos(document, "done");
    const nextDoc = applyDelete(document, pos);
    expect(listItemTexts(nextDoc)).toEqual(["open"]);

    const checked: boolean[] = [];
    nextDoc.descendants((node) => {
      if (node.type === taskItem) {
        checked.push(Boolean(node.attrs.checked));
      }
      return true;
    });
    expect(checked).toEqual([false]);
  });

  it("removes middle paragraph and keeps neighbors (AC11)", () => {
    const document = buildParagraphDoc(["A", "B", "C"]);
    const pos = findTextPos(document, "B");
    const state = stateAt(document, pos);
    const tr = buildDeleteLineTransaction(state)!;
    expect(tr.doc.textContent).toBe("AC");
    expect(tr.doc.textBetween(tr.selection.from, tr.selection.to)).toBe("");
    const $from = tr.doc.resolve(tr.selection.from);
    expect($from.parent.textContent).toBe("A");
  });

  it("removes only heading; section body remains (AC12)", () => {
    const blocksDoc = doc.create({}, [
      heading.create({ level: 2 }, textNode("Blocks")),
      blockquote.create({}, [paragraph.create({}, textNode("quote body"))]),
      codeBlock.create({}, textNode("code")),
    ]);
    const blocksPos = findTextPos(blocksDoc, "Blocks");
    const nextDoc = applyDelete(blocksDoc, blocksPos);
    expect(nextDoc.childCount).toBe(2);
    expect(nextDoc.child(0).type.name).toBe("blockquote");
    expect(nextDoc.child(1).type.name).toBe("codeBlock");
  });

  it("removes entire blockquote (AC13)", () => {
    const document = buildBlockquoteDoc();
    const pos = findTextPos(document, "quote");
    const nextDoc = applyDelete(document, pos);
    expect(nextDoc.textContent).toBe("");
  });

  it("no-ops delete inside table cell (AC14)", () => {
    const document = doc.create({}, [
      table.create({}, [
        tableRow.create({}, [
          tableCell.create({}, [paragraph.create({}, textNode("cell"))]),
        ]),
      ]),
    ]);
    const pos = findTextPos(document, "cell");
    expect(buildDeleteLineTransaction(stateAt(document, pos))).toBeNull();
  });

  it("no-ops delete on horizontal rule (AC15)", () => {
    const document = doc.create({}, [horizontalRule.create()]);
    const pos = 1;
    expect(buildDeleteLineTransaction(stateAt(document, pos))).toBeNull();
    expect(buildDuplicateLineTransaction(stateAt(document, pos))).toBeNull();
  });

  it("removes sole list item without crashing (AC16)", () => {
    const document = doc.create({}, [
      bulletList.create({}, [
        listItem.create({}, [paragraph.create({}, textNode("only"))]),
      ]),
    ]);
    const pos = findTextPos(document, "only");
    const nextDoc = applyDelete(document, pos);
    expect(nextDoc.textContent).toBe("");
  });
});
