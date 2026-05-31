import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";

function fixTableHeaderRowAt(
  tr: Transaction,
  state: EditorState,
  table: ProseMirrorNode,
  tableStart: number,
): void {
  const headerType = state.schema.nodes.tableHeader;
  const cellType = state.schema.nodes.tableCell;
  if (!headerType || !cellType) return;

  const headerRow = table.child(0);
  let row0HasHeader = false;
  headerRow.forEach((cell) => {
    if (cell.type === headerType) row0HasHeader = true;
  });
  if (!row0HasHeader) return;

  let needsFix = false;
  const newHeaderCells = [];
  for (let i = 0; i < headerRow.childCount; i += 1) {
    const cell = headerRow.child(i);
    if (cell.type === cellType) {
      needsFix = true;
      newHeaderCells.push(
        headerType.create(cell.attrs, cell.content, cell.marks),
      );
    } else {
      newHeaderCells.push(cell);
    }
  }
  if (!needsFix) return;

  const newHeaderRow = headerRow.type.create(headerRow.attrs, newHeaderCells);
  const headerRowPos = tableStart + 1;
  tr.replaceWith(
    tr.mapping.map(headerRowPos),
    tr.mapping.map(headerRowPos + headerRow.nodeSize),
    newHeaderRow,
  );
}

/** When row 0 mixes tableHeader + tableCell (e.g. after addColumnAfter on last column), normalize to tableHeader. */
export function fixTableHeaderRowInTransaction(
  tr: Transaction,
  state: EditorState,
): void {
  const $from = tr.selection.$from;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.spec.tableRole === "table") {
      fixTableHeaderRowAt(tr, state, $from.node(depth), $from.start(depth));
      return;
    }
  }

  tr.doc.descendants((node, pos) => {
    if (node.type.spec.tableRole !== "table") return;
    fixTableHeaderRowAt(tr, state, node, pos);
  });
}

/** @internal Test helper for table at doc root. */
export function fixTableHeaderRowInDoc(
  tr: Transaction,
  state: EditorState,
  tableStart = 0,
): void {
  const table = tr.doc.childCount > 0 ? tr.doc.child(0) : null;
  if (!table || table.type.spec.tableRole !== "table") return;
  fixTableHeaderRowAt(tr, state, table, tableStart);
}
