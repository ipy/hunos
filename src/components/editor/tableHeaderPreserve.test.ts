import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import {
  fixTableHeaderRowInDoc,
  fixTableHeaderRowInTransaction,
} from "./tableHeaderPreserve";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
    table: { content: "tableRow+", group: "block", tableRole: "table" },
    tableRow: { content: "(tableCell | tableHeader)+", tableRole: "row" },
    tableHeader: { content: "block+", tableRole: "header_cell", isolating: true },
    tableCell: { content: "block+", tableRole: "cell", isolating: true },
  },
});

function cell(type: "tableHeader" | "tableCell", text: string) {
  return schema.nodes[type].create({}, [
    schema.nodes.paragraph.create({}, text ? [schema.text(text)] : undefined),
  ]);
}

function buildMixedHeaderTableState() {
  const table = schema.nodes.table.create({}, [
    schema.nodes.tableRow.create({}, [
      cell("tableHeader", "名称"),
      cell("tableHeader", "类型"),
      cell("tableHeader", "状态"),
      cell("tableCell", ""),
    ]),
    schema.nodes.tableRow.create({}, [
      cell("tableCell", "粗体"),
      cell("tableCell", "样式"),
      cell("tableCell", "就绪"),
      cell("tableCell", ""),
    ]),
  ]);
  const doc = schema.nodes.doc.create({}, [table]);
  return EditorState.create({ schema, doc });
}

function headerTexts(state: EditorState): string[] {
  const headerRow = state.doc.firstChild?.firstChild;
  if (!headerRow) return [];
  const texts: string[] = [];
  headerRow.forEach((cell) => texts.push(cell.textContent));
  return texts;
}

function headerCellTypes(state: EditorState): string[] {
  const headerRow = state.doc.firstChild?.firstChild;
  if (!headerRow) return [];
  return headerRow.content.content.map((node) => node.type.name);
}

function applyHeaderFix(state: EditorState): EditorState {
  const tr = state.tr;
  fixTableHeaderRowInDoc(tr, state, 0);
  return state.apply(tr);
}

describe("tableHeaderPreserve", () => {
  it("converts mixed header-row cell types after addColumnAfter on last column", () => {
    const state = buildMixedHeaderTableState();
    const headerRow = state.doc.firstChild!.child(0);
    expect(headerRow.childCount).toBe(4);
    expect(headerRow.child(3).type.name).toBe("tableCell");

    const tr = state.tr;
    fixTableHeaderRowInDoc(tr, state, 0);
    expect(tr.steps.length).toBeGreaterThan(0);
    const next = state.apply(tr);

    expect(headerTexts(next)).toEqual(["名称", "类型", "状态", ""]);
    expect(headerCellTypes(next)).toEqual([
      "tableHeader",
      "tableHeader",
      "tableHeader",
      "tableHeader",
    ]);
  });

  it("leaves data rows unchanged", () => {
    const next = applyHeaderFix(buildMixedHeaderTableState());
    const dataRow = next.doc.firstChild?.child(1);
    const dataTypes: string[] = [];
    dataRow?.forEach((cell) => dataTypes.push(cell.type.name));
    expect(dataTypes).toEqual(["tableCell", "tableCell", "tableCell", "tableCell"]);
  });

  it("no-ops when the first row has no header cells", () => {
    const table = schema.nodes.table.create({}, [
      schema.nodes.tableRow.create({}, [
        cell("tableCell", "A"),
        cell("tableCell", "B"),
      ]),
    ]);
    const doc = schema.nodes.doc.create({}, [table]);
    const state = EditorState.create({ schema, doc });
    const next = applyHeaderFix(state);
    expect(next.doc.toJSON()).toEqual(state.doc.toJSON());
  });

  it("fixTableHeaderRowInTransaction is exported for HunosTable hook", () => {
    expect(typeof fixTableHeaderRowInTransaction).toBe("function");
  });
});
