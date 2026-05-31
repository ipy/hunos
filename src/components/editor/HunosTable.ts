import { Table } from "@tiptap/extension-table";
import {
  addColumnAfter as pmAddColumnAfter,
  addColumnBefore as pmAddColumnBefore,
  deleteColumn as pmDeleteColumn,
} from "@tiptap/pm/tables";
import { withHeaderRowFix } from "./tableColumnCommandUtils";

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
