import type { EditorState, Transaction } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";
import { goToNextCell, selectedRect } from "@tiptap/pm/tables";
import { fixTableHeaderRowInTransaction } from "./tableHeaderPreserve";

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
  const cellOffset = rect.map.positionAt(rect.top, insertedCol, rect.table);
  const $cell = afterFix.doc.resolve(rect.tableStart + cellOffset);
  tr.setSelection(TextSelection.create(afterFix.doc, $cell.pos + 1));
}

/** Run a prosemirror-tables column command, normalize header row types, then move selection into inserted columns. */
export function withHeaderRowFix(
  command: (
    state: EditorState,
    dispatch?: (tr: Transaction) => void,
  ) => boolean,
  moveSelection: 1 | -1 | null = null,
) {
  return (state: EditorState, dispatch?: (tr: Transaction) => void) => {
    if (!dispatch) {
      return command(state, undefined);
    }

    return command(state, (tr) => {
      fixTableHeaderRowInTransaction(tr, state);
      if (moveSelection != null) {
        moveSelectionToInsertedColumn(tr, state, moveSelection);
      }
      dispatch(tr);
    });
  };
}
