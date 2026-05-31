import type { EditorState, Transaction } from "@tiptap/pm/state";
import { goToNextCell } from "@tiptap/pm/tables";
import { fixTableHeaderRowInTransaction } from "./tableHeaderPreserve";

/** Run a prosemirror-tables column command, fix header row types, and optionally move selection in the same tr. */
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
        const afterFix = state.apply(tr);
        goToNextCell(moveSelection)(afterFix, (moveTr) => {
          tr.setSelection(moveTr.selection);
        });
      }
      dispatch(tr);
    });
  };
}
