import { getSchema } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import {
  addColumnAfter,
  deleteColumn,
  selectedRect,
  tableNodes,
} from "@tiptap/pm/tables";
import { describe, expect, it, vi } from "vitest";
import { HunosTable } from "./HunosTable";
import { withHeaderRowFix } from "./tableColumnCommandUtils";

const pmTablesSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
    ...tableNodes({
      tableGroup: "block",
      cellContent: "block+",
      cellAttributes: {},
    }),
  },
});

/** Production TipTap schema (colspan attrs + HunosTable commands). */
const tiptapTableSchema = getSchema([
  Document,
  Paragraph,
  Text,
  HunosTable.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
]);

function cell(
  schema: Schema,
  type: "table_header" | "table_cell" | "tableHeader" | "tableCell",
  text: string,
) {
  return schema.nodes[type]!.create({}, [
    schema.nodes.paragraph!.create({}, text ? [schema.text(text)] : undefined),
  ]);
}

function findTextPos(doc: Schema["node"], text: string): number {
  let found = -1;
  doc.descendants((node, pos) => {
    if (found >= 0) return false;
    if (node.isText && node.text === text) {
      found = pos;
      return false;
    }
    return undefined;
  });
  if (found < 0) throw new Error(`text not found: ${text}`);
  return found;
}

function headerTexts(state: EditorState): string[] {
  const headerRow = state.doc.firstChild?.firstChild;
  if (!headerRow) return [];
  const texts: string[] = [];
  headerRow.forEach((node) => texts.push(node.textContent));
  return texts;
}

function headerColumnCount(state: EditorState): number {
  return state.doc.firstChild?.firstChild?.childCount ?? 0;
}

function selectedColumnIndex(state: EditorState): number {
  return selectedRect(state).left;
}

function runColumnCommand(
  state: EditorState,
  command: typeof addColumnAfter,
  moveSelection: 1 | -1 | null,
): EditorState {
  const run = withHeaderRowFix(command, moveSelection);
  let next = state;
  run(state, (tr) => {
    next = state.apply(tr);
  });
  return next;
}

function buildPlaygroundTableState(
  schema: Schema,
  headerType: "table_header" | "tableHeader",
  bodyType: "table_cell" | "tableCell",
  rowType: "table_row" | "tableRow",
  defaultAnchor = "状态",
) {
  const table = schema.nodes.table!.create({}, [
    schema.nodes[rowType]!.create({}, [
      cell(schema, headerType, "名称"),
      cell(schema, headerType, "类型"),
      cell(schema, headerType, "状态"),
    ]),
    schema.nodes[rowType]!.create({}, [
      cell(schema, bodyType, "粗体"),
      cell(schema, bodyType, "样式"),
      cell(schema, bodyType, "就绪"),
    ]),
  ]);
  const doc = schema.nodes.doc.create({}, [table]);
  let state = EditorState.create({ schema, doc });
  state = state.apply(
    state.tr.setSelection(
      TextSelection.create(state.doc, findTextPos(state.doc, defaultAnchor)),
    ),
  );
  return state;
}

describe("HunosTable column commands (prosemirror-tables schema)", () => {
  function expectHeadersPreservedAfterInsertDeleteCycles(
    anchorText: string,
    cycles = 2,
  ) {
    let state = buildPlaygroundTableState(
      pmTablesSchema,
      "table_header",
      "table_cell",
      "table_row",
      anchorText,
    );
    expect(headerTexts(state)).toEqual(["名称", "类型", "状态"]);

    for (let cycle = 0; cycle < cycles; cycle += 1) {
      state = runColumnCommand(state, addColumnAfter, 1);
      state = runColumnCommand(state, deleteColumn, null);
    }

    expect(headerTexts(state)).toEqual(["名称", "类型", "状态"]);
    expect(headerColumnCount(state)).toBe(3);
  }

  it("preserves header labels through add/delete column cycles from last header (AC4)", () => {
    expectHeadersPreservedAfterInsertDeleteCycles("状态");
  });

  it("preserves header labels when inserting/deleting from middle header 类型 (AC4-table-header-delete)", () => {
    expectHeadersPreservedAfterInsertDeleteCycles("类型");
  });

  it("preserves header labels when inserting/deleting from data row 样式 (AC4-table-header-strip)", () => {
    expectHeadersPreservedAfterInsertDeleteCycles("样式");
  });

  it("dispatches the mutated transaction, not a stale tr from post-apply state (AC4-dispatch-mismatch)", () => {
    const state = buildPlaygroundTableState(
      pmTablesSchema,
      "table_header",
      "table_cell",
      "table_row",
    );
    const run = withHeaderRowFix(addColumnAfter, 1);
    let dispatchedTr: ReturnType<EditorState["tr"]> | null = null;

    const ok = run(state, (tr) => {
      dispatchedTr = tr;
    });

    expect(ok).toBe(true);
    expect(dispatchedTr).not.toBeNull();
    expect(dispatchedTr).not.toBe(state.tr);
    expect(dispatchedTr!.doc).not.toBe(state.doc);
    expect(headerTexts(state.apply(dispatchedTr!))).toEqual([
      "名称",
      "类型",
      "状态",
      "",
    ]);
    expect(
      dispatchedTr!.selection.eq(state.apply(dispatchedTr!).selection),
    ).toBe(true);
  });

  it("does not dispatch next.tr built from an intermediate EditorState", () => {
    const state = buildPlaygroundTableState(
      pmTablesSchema,
      "table_header",
      "table_cell",
      "table_row",
    );
    const run = withHeaderRowFix(addColumnAfter, 1);
    const dispatch = vi.fn((tr) => {
      expect(tr).not.toBe(state.tr);
      const applied = state.apply(tr);
      expect(tr.doc).toBe(applied.doc);
    });

    expect(run(state, dispatch)).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});

describe("HunosTable column commands (TipTap tableHeader schema)", () => {
  it("preserves header labels through add/delete cycles with header-row fix enabled (AC4)", () => {
    let state = buildPlaygroundTableState(
      tiptapTableSchema,
      "tableHeader",
      "tableCell",
      "tableRow",
      "类型",
    );
    expect(headerTexts(state)).toEqual(["名称", "类型", "状态"]);

    for (let cycle = 0; cycle < 2; cycle += 1) {
      state = runColumnCommand(state, addColumnAfter, 1);
      state = runColumnCommand(state, deleteColumn, null);
    }

    expect(headerTexts(state)).toEqual(["名称", "类型", "状态"]);
    expect(headerColumnCount(state)).toBe(3);
    const headerRow = state.doc.firstChild?.firstChild;
    headerRow?.forEach((cell) => {
      expect(cell.type.name).toBe("tableHeader");
    });
  });

  it("AC4-header-round-trip: selection lands in inserted column after insert from 类型", () => {
    let state = buildPlaygroundTableState(
      tiptapTableSchema,
      "tableHeader",
      "tableCell",
      "tableRow",
      "类型",
    );
    expect(selectedColumnIndex(state)).toBe(1);

    state = runColumnCommand(state, addColumnAfter, 1);
    expect(headerColumnCount(state)).toBe(4);
    expect(selectedColumnIndex(state)).toBe(2);
    expect(headerTexts(state)).toEqual(["名称", "类型", "", "状态"]);

    state = runColumnCommand(state, deleteColumn, null);
    expect(headerTexts(state)).toEqual(["名称", "类型", "状态"]);
    expect(headerColumnCount(state)).toBe(3);
  });

  it("AC4-header-round-trip: two insert-delete cycles from 类型 header preserve headers", () => {
    let state = buildPlaygroundTableState(
      tiptapTableSchema,
      "tableHeader",
      "tableCell",
      "tableRow",
      "类型",
    );

    for (let cycle = 0; cycle < 2; cycle += 1) {
      state = runColumnCommand(state, addColumnAfter, 1);
      state = runColumnCommand(state, deleteColumn, null);
    }

    expect(headerTexts(state)).toEqual(["名称", "类型", "状态"]);
    expect(headerColumnCount(state)).toBe(3);
  });

  it("does not leave a trailing empty header column after insert/delete (AC4-table-header-delete)", () => {
    let state = buildPlaygroundTableState(
      tiptapTableSchema,
      "tableHeader",
      "tableCell",
      "tableRow",
      "类型",
    );
    state = runColumnCommand(state, addColumnAfter, 1);
    expect(headerColumnCount(state)).toBe(4);
    state = runColumnCommand(state, deleteColumn, null);
    expect(headerColumnCount(state)).toBe(3);
    expect(headerTexts(state)).toEqual(["名称", "类型", "状态"]);
  });

  it("deleteColumn alone removes focused column without blanking sibling headers", () => {
    let state = buildPlaygroundTableState(
      tiptapTableSchema,
      "tableHeader",
      "tableCell",
      "tableRow",
      "类型",
    );
    state = runColumnCommand(state, deleteColumn, null);
    expect(headerTexts(state)).toEqual(["名称", "状态"]);
    expect(headerColumnCount(state)).toBe(2);
  });
});
