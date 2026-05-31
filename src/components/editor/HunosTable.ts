import { Table } from "@tiptap/extension-table";
import type { Transaction } from "@tiptap/pm/state";
import {
  addColumnAfter as pmAddColumnAfter,
  addColumnBefore as pmAddColumnBefore,
  deleteColumn as pmDeleteColumn,
} from "@tiptap/pm/tables";
import { fixTableHeaderRowInTransaction } from "./tableHeaderPreserve";

function withHeaderRowFix(
  command: (
    state: Parameters<typeof pmAddColumnAfter>[0],
    dispatch?: (tr: Transaction) => void,
  ) => boolean,
) {
  return (
    state: Parameters<typeof pmAddColumnAfter>[0],
    dispatch?: (tr: Transaction) => void,
  ) =>
    command(
      state,
      dispatch
        ? (tr) => {
            fixTableHeaderRowInTransaction(tr, state);
            dispatch(tr);
          }
        : undefined,
    );
}

/** Table extension that keeps header-row cell types after column insert/delete. */
export const HunosTable = Table.extend({
  addCommands() {
    return {
      ...this.parent?.(),
      addColumnAfter: () => ({ state, dispatch }) =>
        withHeaderRowFix(pmAddColumnAfter)(state, dispatch),
      addColumnBefore: () => ({ state, dispatch }) =>
        withHeaderRowFix(pmAddColumnBefore)(state, dispatch),
      deleteColumn: () => ({ state, dispatch }) =>
        withHeaderRowFix(pmDeleteColumn)(state, dispatch),
    };
  },
});
