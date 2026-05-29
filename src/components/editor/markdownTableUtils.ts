import type {
  Node as ProseMirrorNode,
  ResolvedPos,
  Schema,
} from "@tiptap/pm/model";
import { TextSelection, type Transaction } from "@tiptap/pm/state";

const SEPARATOR_CELL_REGEX = /^:?-{3,}:?$/;

/** Match a GFM pipe row ending with Enter (input-rule text includes trailing newline). */
export function findPipeTableInputMatch(text: string): RegExpExecArray | null {
  return /^\s*(\|(?:[^|\n]+\|)+)\s*\n$/.exec(text);
}

export function parsePipeTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) {
    return null;
  }

  const parts = trimmed.split("|");
  if (parts.length < 2) {
    return null;
  }

  const cells = parts.slice(1, -1).map((cell) => cell.trim());
  if (cells.length === 0 || cells.every((cell) => cell.length === 0)) {
    return null;
  }

  return cells;
}

export function isTableSeparatorRow(cells: string[]): boolean {
  return (
    cells.length > 0 && cells.every((cell) => SEPARATOR_CELL_REGEX.test(cell))
  );
}

export function isBlockedForTableInput($pos: ResolvedPos): boolean {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const name = $pos.node(depth).type.name;
    if (
      name === "tableCell" ||
      name === "tableHeader" ||
      name === "codeBlock"
    ) {
      return true;
    }
  }

  return !$pos.parent.isTextblock || $pos.parent.type.name !== "paragraph";
}

export function createTableWithHeaderRow(
  schema: Schema,
  headerCells: string[],
): ProseMirrorNode {
  const { table, tableRow, tableHeader, tableCell, paragraph } = schema.nodes;

  const headerRow = tableRow.create(
    null,
    headerCells.map((value) =>
      tableHeader.create(null, [
        paragraph.create(null, value ? schema.text(value) : undefined),
      ]),
    ),
  );

  const dataRow = tableRow.create(
    null,
    headerCells.map(() => tableCell.createAndFill()!),
  );

  return table.create(null, [headerRow, dataRow]);
}

export function setSelectionInTableCell(
  tr: Transaction,
  tablePos: number,
  rowIndex: number,
  colIndex: number,
): void {
  const table = tr.doc.nodeAt(tablePos);
  if (!table || table.type.name !== "table") {
    return;
  }

  let pos = tablePos + 1;
  for (let row = 0; row < rowIndex; row += 1) {
    pos += table.child(row).nodeSize;
  }

  const row = table.child(rowIndex);
  for (let col = 0; col < colIndex; col += 1) {
    pos += row.child(col).nodeSize;
  }

  const cell = row.child(colIndex);
  const paragraph = cell.firstChild;
  if (!paragraph?.isTextblock) {
    return;
  }

  tr.setSelection(TextSelection.create(tr.doc, pos + 1));
}
