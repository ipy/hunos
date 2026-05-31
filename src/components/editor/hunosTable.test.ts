import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import {
  addColumnAfter,
  deleteColumn,
  goToNextCell,
  tableNodes,
} from "@tiptap/pm/tables";
import { describe, expect, it } from "vitest";
import { fixTableHeaderRowInTransaction } from "./tableHeaderPreserve";

const schema = new Schema({
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

function cell(type: "table_header" | "table_cell", text: string) {
  return schema.nodes[type]!.create({}, [
    schema.nodes.paragraph!.create({}, text ? [schema.text(text)] : undefined),
  ]);
}

function findTextPos(
  doc: ReturnType<typeof schema.node>,
  text: string,
): number {
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

function runColumnCommand(
  state: EditorState,
  command: typeof addColumnAfter,
  moveSelection: 1 | -1 | null,
): EditorState {
  let next = state;
  command(state, (tr) => {
    fixTableHeaderRowInTransaction(tr, state);
    next = state.apply(tr);
    if (moveSelection != null) {
      goToNextCell(moveSelection)(next, (moveTr) => {
        next = next.apply(moveTr);
      });
    }
  });
  return next;
}

function buildPlaygroundTableState() {
  const table = schema.nodes.table!.create({}, [
    schema.nodes.table_row!.create({}, [
      cell("table_header", "名称"),
      cell("table_header", "类型"),
      cell("table_header", "状态"),
    ]),
    schema.nodes.table_row!.create({}, [
      cell("table_cell", "粗体"),
      cell("table_cell", "样式"),
      cell("table_cell", "就绪"),
    ]),
  ]);
  const doc = schema.nodes.doc.create({}, [table]);
  let state = EditorState.create({ schema, doc });
  state = state.apply(
    state.tr.setSelection(
      TextSelection.create(state.doc, findTextPos(state.doc, "状态")),
    ),
  );
  return state;
}

describe("HunosTable column commands", () => {
  it("preserves header labels through add/delete column cycles (AC4)", () => {
    let state = buildPlaygroundTableState();
    expect(headerTexts(state)).toEqual(["名称", "类型", "状态"]);

    for (let cycle = 0; cycle < 2; cycle += 1) {
      state = runColumnCommand(state, addColumnAfter, 1);
      state = runColumnCommand(state, deleteColumn, null);
    }

    expect(headerTexts(state)).toEqual(["名称", "类型", "状态"]);
  });
});
