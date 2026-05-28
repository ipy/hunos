import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import {
  buildMoveBlockTransaction,
  canMoveBlock,
  getMovableBlockRange,
} from "./blockMoveUtils";

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
      taskItem.create({ checked: false }, [
        paragraph.create({}, textNode("pending")),
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

function applyMove(
  document: ReturnType<typeof buildThreeBulletDoc>,
  pos: number,
  direction: "up" | "down",
) {
  const state = stateAt(document, pos);
  const tr = buildMoveBlockTransaction(state, direction);
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

describe("getMovableBlockRange", () => {
  it("returns list item range inside bullet list", () => {
    const document = buildThreeBulletDoc();
    const pos = findTextPos(document, "two");
    const range = getMovableBlockRange(document.resolve(pos));
    expect(range).not.toBeNull();
    expect(document.textBetween(range!.from, range!.to)).toBe("two");
  });

  it("returns null for single-paragraph blockquote interior (AC10)", () => {
    const document = buildBlockquoteDoc();
    const pos = findTextPos(document, "quote");
    expect(getMovableBlockRange(document.resolve(pos))).toBeNull();
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
    expect(getMovableBlockRange(document.resolve(pos))).toBeNull();
  });
});

describe("canMoveBlock", () => {
  it("blocks move up for first bullet item", () => {
    const document = buildThreeBulletDoc();
    const pos = findTextPos(document, "one");
    const range = getMovableBlockRange(document.resolve(pos))!;
    expect(canMoveBlock(document, range, "up")).toBe(false);
    expect(canMoveBlock(document, range, "down")).toBe(true);
  });

  it("blocks move down for last bullet item", () => {
    const document = buildThreeBulletDoc();
    const pos = findTextPos(document, "three");
    const range = getMovableBlockRange(document.resolve(pos))!;
    expect(canMoveBlock(document, range, "down")).toBe(false);
    expect(canMoveBlock(document, range, "up")).toBe(true);
  });

  it("allows nested last item to move down via lift", () => {
    const document = buildNestedDoc();
    const pos = findTextPos(document, "two");
    const range = getMovableBlockRange(document.resolve(pos))!;
    expect(canMoveBlock(document, range, "down")).toBe(true);
  });
});

describe("buildMoveBlockTransaction", () => {
  it("swaps second bullet above first (AC1)", () => {
    const document = buildThreeBulletDoc();
    const pos = findTextPos(document, "two");
    const nextDoc = applyMove(document, pos, "up");
    expect(listItemTexts(nextDoc)).toEqual(["two", "one", "three"]);
  });

  it("swaps first bullet below second (AC2)", () => {
    const document = buildThreeBulletDoc();
    const pos = findTextPos(document, "one");
    const nextDoc = applyMove(document, pos, "down");
    expect(listItemTexts(nextDoc)).toEqual(["two", "one", "three"]);
  });

  it("lifts nested item below parent (AC3)", () => {
    const document = buildNestedDoc();
    const pos = findTextPos(document, "two");
    const nextDoc = applyMove(document, pos, "down");
    expect(listItemTexts(nextDoc)).toEqual(["one", "two", "three"]);
  });

  it("swaps ordered items and preserves numbering content (AC4)", () => {
    const document = buildOrderedDoc();
    const pos = findTextPos(document, "second");
    const nextDoc = applyMove(document, pos, "up");
    expect(listItemTexts(nextDoc)).toEqual(["second", "first", "third"]);
  });

  it("swaps task items with checkbox attrs (AC5)", () => {
    const document = buildTaskDoc();
    const pos = findTextPos(document, "pending");
    const nextDoc = applyMove(document, pos, "up");
    expect(listItemTexts(nextDoc)).toEqual(["open", "pending", "done"]);

    const checkedStates: boolean[] = [];
    nextDoc.descendants((node) => {
      if (node.type === taskItem) {
        checkedStates.push(Boolean(node.attrs.checked));
      }
      return true;
    });
    expect(checkedStates).toEqual([false, false, true]);
  });

  it("swaps consecutive paragraphs (AC6)", () => {
    const document = buildParagraphDoc(["A", "B", "C"]);
    const pos = findTextPos(document, "B");
    const upDoc = applyMove(document, pos, "up");
    expect(upDoc.textContent).toBe("BAC");

    const downDoc = applyMove(document, pos, "down");
    expect(downDoc.textContent).toBe("ACB");
  });

  it("swaps heading sections with attached body via Mod+Alt+Up (AC7)", () => {
    const document = buildHeadingSectionDoc();
    const pos = findTextPos(document, "Lists");
    const nextDoc = applyMove(document, pos, "up");
    expect(nextDoc.child(0).textContent).toBe("Lists");
    expect(nextDoc.child(1).type.name).toBe("bulletList");
    expect(nextDoc.child(2).textContent).toBe("Inline Marks");
    expect(nextDoc.child(3).textContent).toBe("inline body");
  });

  it("does not swap Lists section above Inline Marks via Mod+Alt+Down (AC7)", () => {
    const document = buildHeadingSectionDoc();
    const pos = findTextPos(document, "Lists");
    const state = stateAt(document, pos);
    expect(buildMoveBlockTransaction(state, "down")).toBeNull();
  });

  it("no-ops move up on first bullet via null transaction (AC8)", () => {
    const document = buildThreeBulletDoc();
    const state = stateAt(document, findTextPos(document, "one"));
    expect(buildMoveBlockTransaction(state, "up")).toBeNull();
  });

  it("no-ops move down on last bullet via null transaction (AC9)", () => {
    const document = buildThreeBulletDoc();
    const state = stateAt(document, findTextPos(document, "three"));
    expect(buildMoveBlockTransaction(state, "down")).toBeNull();
  });

  it("no-ops both directions for single-paragraph blockquote (AC10)", () => {
    const document = buildBlockquoteDoc();
    const pos = findTextPos(document, "quote");
    const state = stateAt(document, pos);
    expect(buildMoveBlockTransaction(state, "up")).toBeNull();
    expect(buildMoveBlockTransaction(state, "down")).toBeNull();
  });

  it("no-ops seed playground blockquote between siblings (AC10)", () => {
    const document = doc.create({}, [
      heading.create({ level: 2 }, textNode("Blocks")),
      blockquote.create({}, [paragraph.create({}, textNode("A blockquote"))]),
      codeBlock.create({}, textNode('const x = "y";')),
    ]);
    const pos = findTextPos(document, "A blockquote");
    const state = stateAt(document, pos);
    expect(buildMoveBlockTransaction(state, "up")).toBeNull();
    expect(buildMoveBlockTransaction(state, "down")).toBeNull();
  });
});
