import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";
import {
  deleteColumn as pmDeleteColumn,
  goToNextCell,
  selectedRect,
} from "@tiptap/pm/tables";
import { fixTableHeaderRowInTransaction } from "./tableHeaderPreserve";

export type ColumnCommandContext = {
  insertGuard: null | "inserted" | "deleted-once";
  anchorCol: number;
  insertedCol: number;
};

export function createColumnCommandContext(): ColumnCommandContext {
  return { insertGuard: null, anchorCol: 0, insertedCol: 0 };
}

/** Record the anchor column before addColumnBefore/After so delete can round-trip. */
export function markColumnInsertPending(
  context: ColumnCommandContext,
  state: EditorState,
  side: "before" | "after",
): void {
  const rect = selectedRect(state);
  context.insertGuard = "inserted";
  context.anchorCol = rect.left;
  context.insertedCol = side === "after" ? rect.right : rect.left;
}

function selectionPosInsideCell(
  table: ProseMirrorNode,
  tableStart: number,
  row: number,
  col: number,
): number | null {
  let pos = tableStart;
  for (let r = 0; r < row; r += 1) {
    pos += table.child(r).nodeSize;
  }

  const rowNode = table.child(row);
  pos += 1;
  for (let c = 0; c < col; c += 1) {
    pos += rowNode.child(c).nodeSize;
  }

  pos += 1;
  const block = rowNode.child(col).firstChild;
  if (block?.isTextblock) {
    return pos + 1;
  }
  return pos;
}

function restoreSelectionToColumn(
  tr: Transaction,
  state: EditorState,
  colIndex: number,
): void {
  const after = state.apply(tr);
  const rect = selectedRect(after);
  const pos = selectionPosInsideCell(
    rect.table,
    rect.tableStart,
    rect.top,
    colIndex,
  );
  if (pos == null) return;
  tr.setSelection(TextSelection.create(after.doc, pos));
}

/** Place selection in the column just inserted by addColumnBefore/After (after header-row normalization). */
function moveSelectionToInsertedColumn(
  tr: Transaction,
  state: EditorState,
  insertSide: 1 | -1,
): void {
  const before = selectedRect(state);
  const insertedCol = insertSide === 1 ? before.right : before.left;
  const afterFix = state.apply(tr);

  const moved = goToNextCell(insertSide)(afterFix, (moveTr) => {
    tr.setSelection(moveTr.selection);
  });
  if (moved) return;

  const rect = selectedRect(afterFix);
  const pos = selectionPosInsideCell(
    rect.table,
    rect.tableStart,
    rect.top,
    insertedCol,
  );
  if (pos == null) return;
  tr.setSelection(TextSelection.create(afterFix.doc, pos));
}

function finalizeDeleteColumn(
  tr: Transaction,
  state: EditorState,
  context: ColumnCommandContext | undefined,
  deletedCol: number,
): void {
  if (!context) return;

  if (
    context.insertGuard === "inserted" &&
    deletedCol === context.insertedCol
  ) {
    restoreSelectionToColumn(tr, state, context.anchorCol);
    context.insertGuard = "deleted-once";
    return;
  }

  context.insertGuard = null;
}

/** Run a prosemirror-tables column command, normalize header row types, then move selection into inserted columns. */
export function withHeaderRowFix(
  command: (
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
  ) => boolean,
  moveSelection: 1 | -1 | null = null,
  context?: ColumnCommandContext,
) {
  return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    if (
      command === pmDeleteColumn &&
      context?.insertGuard === "deleted-once"
    ) {
      if (!dispatch) {
        return false;
      }
      context.insertGuard = null;
      return true;
    }

    if (!dispatch) {
      return command(state, undefined);
    }

    const deletedCol =
      command === pmDeleteColumn ? selectedRect(state).left : -1;

    return command(state, (tr) => {
      fixTableHeaderRowInTransaction(tr, state);
      if (moveSelection != null) {
        moveSelectionToInsertedColumn(tr, state, moveSelection);
      }
      if (command === pmDeleteColumn) {
        finalizeDeleteColumn(tr, state, context, deletedCol);
      }
      dispatch(tr);
    });
  };
}
