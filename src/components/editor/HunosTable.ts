import { Table } from "@tiptap/extension-table";
import type { Editor } from "@tiptap/core";
import {
  addColumnAfter as pmAddColumnAfter,
  addColumnBefore as pmAddColumnBefore,
  deleteColumn as pmDeleteColumn,
} from "@tiptap/pm/tables";
import {
  createColumnCommandContext,
  markColumnInsertPending,
  withHeaderRowFix,
  type ColumnCommandContext,
} from "./tableColumnCommandUtils";

type HunosTableStorage = {
  columnCommandContext: ColumnCommandContext;
};

function columnContext(editor: Editor): ColumnCommandContext {
  return (editor.storage as { table: HunosTableStorage }).table
    .columnCommandContext;
}

/** Table extension that keeps header-row cell types after column insert/delete. */
export const HunosTable = Table.extend({
  addStorage() {
    return {
      columnCommandContext: createColumnCommandContext(),
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      addColumnAfter:
        () =>
        ({ state, dispatch, editor }) => {
          if (dispatch) {
            markColumnInsertPending(columnContext(editor), state, "after");
          }
          return withHeaderRowFix(
            pmAddColumnAfter,
            1,
            columnContext(editor),
          )(state, dispatch);
        },
      addColumnBefore:
        () =>
        ({ state, dispatch, editor }) => {
          if (dispatch) {
            markColumnInsertPending(columnContext(editor), state, "before");
          }
          return withHeaderRowFix(
            pmAddColumnBefore,
            -1,
            columnContext(editor),
          )(state, dispatch);
        },
      deleteColumn:
        () =>
        ({ state, dispatch, editor }) =>
          withHeaderRowFix(
            pmDeleteColumn,
            null,
            columnContext(editor),
          )(state, dispatch),
    };
  },
});
