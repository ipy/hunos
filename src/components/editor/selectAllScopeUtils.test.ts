import { Schema } from "@tiptap/pm/model";
import { AllSelection, EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import {
  buildSelectAllTransaction,
  getSelectAllScopeRange,
  isEntireDocumentSelected,
  isSelectAllScopeFullySelected,
} from "./selectAllScopeUtils";

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
  listItem,
  taskList,
  taskItem,
  blockquote,
  codeBlock,
  table,
  tableRow,
  tableCell,
  tableHeader,
} = schema.nodes;

function textNode(value: string) {
  return schema.text(value);
}

function findTextPos(document: ReturnType<typeof doc.create>, text: string) {
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

function stateAt(document: ReturnType<typeof doc.create>, pos: number) {
  return EditorState.create({
    doc: document,
    schema,
    selection: TextSelection.create(document, pos),
  });
}

function stateWithSelection(
  document: ReturnType<typeof doc.create>,
  from: number,
  to: number,
) {
  return EditorState.create({
    doc: document,
    schema,
    selection: TextSelection.create(document, from, to),
  });
}

function applySelectAll(state: EditorState) {
  const tr = buildSelectAllTransaction(state);
  expect(tr).not.toBeNull();
  return state.apply(tr!);
}

describe("getSelectAllScopeRange", () => {
  it("returns table cell content range (AC1)", () => {
    const document = doc.create({}, [
      paragraph.create({}, textNode("intro")),
      table.create({}, [
        tableRow.create({}, [
          tableHeader.create({}, [paragraph.create({}, textNode("Name"))]),
          tableCell.create({}, [paragraph.create({}, textNode("Bold"))]),
        ]),
      ]),
    ]);
    const pos = findTextPos(document, "Bold");
    const scope = getSelectAllScopeRange(document.resolve(pos));
    expect(scope).not.toBeNull();
    expect(document.textBetween(scope!.from, scope!.to)).toBe("Bold");
  });

  it("returns code block content range (AC3)", () => {
    const document = doc.create({}, [
      codeBlock.create({}, textNode('const x = "y";')),
    ]);
    const pos = findTextPos(document, 'const x = "y";');
    const scope = getSelectAllScopeRange(document.resolve(pos));
    expect(document.textBetween(scope!.from, scope!.to)).toBe('const x = "y";');
  });

  it("returns list item content range (AC4)", () => {
    const document = doc.create({}, [
      bulletList.create({}, [
        listItem.create({}, [paragraph.create({}, textNode("alpha"))]),
        listItem.create({}, [paragraph.create({}, textNode("beta"))]),
      ]),
    ]);
    const pos = findTextPos(document, "beta");
    const scope = getSelectAllScopeRange(document.resolve(pos));
    expect(document.textBetween(scope!.from, scope!.to)).toBe("beta");
  });

  it("returns blockquote content range (AC5)", () => {
    const document = doc.create({}, [
      blockquote.create({}, [paragraph.create({}, textNode("quoted"))]),
    ]);
    const pos = findTextPos(document, "quoted");
    const scope = getSelectAllScopeRange(document.resolve(pos));
    expect(document.textBetween(scope!.from, scope!.to)).toBe("quoted");
  });

  it("returns top-level paragraph range (AC6)", () => {
    const document = doc.create({}, [
      paragraph.create({}, textNode("first")),
      paragraph.create({}, textNode("second")),
    ]);
    const pos = findTextPos(document, "second");
    const scope = getSelectAllScopeRange(document.resolve(pos));
    expect(document.textBetween(scope!.from, scope!.to)).toBe("second");
  });

  it("returns heading range (AC7)", () => {
    const document = doc.create({}, [
      heading.create({ level: 2 }, textNode("Section")),
      paragraph.create({}, textNode("body")),
    ]);
    const pos = findTextPos(document, "Section");
    const scope = getSelectAllScopeRange(document.resolve(pos));
    expect(document.textBetween(scope!.from, scope!.to)).toBe("Section");
  });
});

describe("buildSelectAllTransaction", () => {
  it("first Mod+A in table cell selects only that cell (AC1)", () => {
    const document = doc.create({}, [
      paragraph.create({}, textNode("before table")),
      table.create({}, [
        tableRow.create({}, [
          tableCell.create({}, [paragraph.create({}, textNode("Bold"))]),
          tableCell.create({}, [paragraph.create({}, textNode("Other"))]),
        ]),
      ]),
      paragraph.create({}, textNode("after table")),
    ]);
    const pos = findTextPos(document, "Bold");
    const next = applySelectAll(stateAt(document, pos));
    expect(next.selection).toBeInstanceOf(TextSelection);
    expect(document.textBetween(next.selection.from, next.selection.to)).toBe(
      "Bold",
    );
    expect(isEntireDocumentSelected(next.selection)).toBe(false);
  });

  it("second Mod+A in table cell selects entire note (AC2)", () => {
    const document = doc.create({}, [
      paragraph.create({}, textNode("before table")),
      table.create({}, [
        tableRow.create({}, [
          tableCell.create({}, [paragraph.create({}, textNode("Bold"))]),
        ]),
      ]),
    ]);
    const pos = findTextPos(document, "Bold");
    const scope = getSelectAllScopeRange(document.resolve(pos))!;
    let state = stateAt(document, pos);
    state = applySelectAll(state);
    expect(isSelectAllScopeFullySelected(state.selection, scope)).toBe(true);

    state = applySelectAll(state);
    expect(state.selection).toBeInstanceOf(AllSelection);
    expect(isEntireDocumentSelected(state.selection)).toBe(true);
  });

  it("first Mod+A in code block selects block contents (AC3)", () => {
    const document = doc.create({}, [
      paragraph.create({}, textNode("lead")),
      codeBlock.create({}, textNode("line one\nline two")),
    ]);
    const pos = findTextPos(document, "line one\nline two");
    const next = applySelectAll(stateAt(document, pos));
    expect(document.textBetween(next.selection.from, next.selection.to)).toBe(
      "line one\nline two",
    );
  });

  it("first Mod+A in list item selects that item only (AC4)", () => {
    const document = doc.create({}, [
      bulletList.create({}, [
        listItem.create({}, [paragraph.create({}, textNode("one"))]),
        listItem.create({}, [paragraph.create({}, textNode("two"))]),
      ]),
    ]);
    const pos = findTextPos(document, "two");
    const next = applySelectAll(stateAt(document, pos));
    expect(document.textBetween(next.selection.from, next.selection.to)).toBe(
      "two",
    );
  });

  it("first Mod+A in blockquote selects quote body (AC5)", () => {
    const document = doc.create({}, [
      blockquote.create({}, [paragraph.create({}, textNode("quote body"))]),
      paragraph.create({}, textNode("outside")),
    ]);
    const pos = findTextPos(document, "quote body");
    const next = applySelectAll(stateAt(document, pos));
    expect(document.textBetween(next.selection.from, next.selection.to)).toBe(
      "quote body",
    );
  });

  it("first Mod+A in paragraph selects that paragraph (AC6)", () => {
    const document = doc.create({}, [
      paragraph.create({}, textNode("alpha")),
      paragraph.create({}, textNode("beta")),
    ]);
    const pos = findTextPos(document, "beta");
    const next = applySelectAll(stateAt(document, pos));
    expect(document.textBetween(next.selection.from, next.selection.to)).toBe(
      "beta",
    );
  });

  it("first Mod+A in heading selects heading text (AC7)", () => {
    const document = doc.create({}, [
      heading.create({ level: 2 }, textNode("Heading")),
      paragraph.create({}, textNode("body")),
    ]);
    const pos = findTextPos(document, "Heading");
    const next = applySelectAll(stateAt(document, pos));
    expect(document.textBetween(next.selection.from, next.selection.to)).toBe(
      "Heading",
    );
  });

  it("first Mod+A in task item selects task row (AC8)", () => {
    const document = doc.create({}, [
      taskList.create({}, [
        taskItem.create({ checked: false }, [
          paragraph.create({}, textNode("todo")),
        ]),
      ]),
    ]);
    const pos = findTextPos(document, "todo");
    const next = applySelectAll(stateAt(document, pos));
    expect(document.textBetween(next.selection.from, next.selection.to)).toBe(
      "todo",
    );
  });

  it("expands partial selection within scope before selecting whole note (AC9)", () => {
    const document = doc.create({}, [
      paragraph.create({}, textNode("abcdef")),
    ]);
    const pos = findTextPos(document, "abcdef");
    const partial = stateWithSelection(document, pos, pos + 3);
    const next = applySelectAll(partial);
    expect(document.textBetween(next.selection.from, next.selection.to)).toBe(
      "abcdef",
    );
  });

  it("third Mod+A keeps entire note selected (AC10)", () => {
    const document = doc.create({}, [
      paragraph.create({}, textNode("solo paragraph")),
    ]);
    let state = stateAt(document, findTextPos(document, "solo paragraph"));
    state = applySelectAll(state);
    state = applySelectAll(state);
    expect(state.selection).toBeInstanceOf(AllSelection);

    const tr = buildSelectAllTransaction(state);
    expect(tr).toBeNull();
  });
});
