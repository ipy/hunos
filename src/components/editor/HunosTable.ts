import { Table } from "@tiptap/extension-table";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import {
  addColumnAfter as pmAddColumnAfter,
  addColumnBefore as pmAddColumnBefore,
  deleteColumn as pmDeleteColumn,
  goToNextCell,
} from "@tiptap/pm/tables";
import { fixTableHeaderRowInTransaction } from "./tableHeaderPreserve";

function withHeaderRowFix(
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

    let applied = false;
    const ok = command(state, (tr) => {
      fixTableHeaderRowInTransaction(tr, state);
      let next = state.apply(tr);
      if (moveSelection != null) {
        goToNextCell(moveSelection)(next, (moveTr) => {
          next = next.apply(moveTr);
        });
      }
      dispatch(next.tr);
      applied = true;
    });

    return ok && applied;
  };
}

/** Table extension that keeps header-row cell types after column insert/delete. */
export const HunosTable = Table.extend({
  addCommands() {
    return {
      ...this.parent?.(),
      addColumnAfter:
        () =>
        ({ state, dispatch }) =>
          withHeaderRowFix(pmAddColumnAfter, 1)(state, dispatch),
      addColumnBefore:
        () =>
        ({ state, dispatch }) =>
          withHeaderRowFix(pmAddColumnBefore, -1)(state, dispatch),
      deleteColumn:
        () =>
        ({ state, dispatch }) =>
          withHeaderRowFix(pmDeleteColumn)(state, dispatch),
    };
  },
});
