import type {
  Node as ProseMirrorNode,
  ResolvedPos,
  Schema,
} from "@tiptap/pm/model";
import { EditorState, TextSelection, type Transaction } from "@tiptap/pm/state";

const SEPARATOR_CELL_REGEX = /^:?-{3,}:?$/;

/** GFM pipe row on Enter — capture group 1 is the row without trailing newline. */
export const PIPE_TABLE_INPUT_REGEX = /^\s*(\|(?:[^|\n]+\|)+)\s*\n$/;

export type PipeTableInputMatch = {
  0: string;
  1?: string;
};

/** Match a GFM pipe row ending with Enter (input-rule text includes trailing newline). */
export function findPipeTableInputMatch(text: string): RegExpExecArray | null {
  return PIPE_TABLE_INPUT_REGEX.exec(text);
}

/** Mutates `tr` when the pipe-table input rule applies; returns whether the doc changed. */
export function applyPipeTableInputToTransaction(
  state: EditorState,
  tr: Transaction,
  range: { from: number; to: number },
  match: PipeTableInputMatch,
): boolean {
  const rawLine = match[1];
  if (!rawLine) {
    return false;
  }
  const cells = parsePipeTableRow(rawLine);
  if (!cells) {
    return false;
  }

  const $from = state.doc.resolve(range.from);
  if (isBlockedForTableInput($from)) {
    return false;
  }

  const { schema } = state;
  const blockDepth = $from.depth;
  const blockStart = $from.before(blockDepth);
  const blockEnd = $from.after(blockDepth);
  const blockIndex = $from.index(blockDepth - 1);
  const parent = $from.node(blockDepth - 1);
  const isSeparator = isTableSeparatorRow(cells);

  if (isSeparator) {
    if (blockIndex > 0) {
      const prev = parent.child(blockIndex - 1);
      if (prev.type.name === "paragraph") {
        const prevCells = parsePipeTableRow(prev.textContent);
        if (prevCells && !isTableSeparatorRow(prevCells)) {
          const prevStart = blockStart - prev.nodeSize;
          const table = createTableWithHeaderRow(schema, prevCells);
          tr.replaceWith(prevStart, blockEnd, table);
          setSelectionInTableCell(tr, prevStart, 1, 0);
          return true;
        }
      }
      if (prev.type.name === "table") {
        tr.delete(blockStart, blockEnd);
        return true;
      }
    }
    return false;
  }

  const table = createTableWithHeaderRow(schema, cells);
  tr.replaceWith(blockStart, blockEnd, table);
  setSelectionInTableCell(tr, blockStart, 1, 0);
  return true;
}

/** Apply pipe-table input rule; returns updated state or null when the rule does not apply. */
export function applyPipeTableInputRule(
  state: EditorState,
  range: { from: number; to: number },
  match: PipeTableInputMatch,
): EditorState | null {
  const tr = state.tr;
  if (!applyPipeTableInputToTransaction(state, tr, range, match)) {
    return null;
  }
  return state.apply(tr);
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

export function isInLiteralTableOrCodeContext($pos: ResolvedPos): boolean {
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
  return false;
}

export function isBlockedForTableInput($pos: ResolvedPos): boolean {
  if (isInLiteralTableOrCodeContext($pos)) {
    return true;
  }

  return !$pos.parent.isTextblock || $pos.parent.type.name !== "paragraph";
}

export type ParsedPipeTable = {
  headerCells: string[];
  dataRows: string[][];
};

function parsePipeTableBlockAt(
  lines: string[],
  startIndex: number,
): ParsedPipeTable | null {
  const headerCells = parsePipeTableRow(lines[startIndex]!);
  if (!headerCells || isTableSeparatorRow(headerCells)) {
    return null;
  }

  let separatorIndex = startIndex + 1;
  while (separatorIndex < lines.length && lines[separatorIndex]!.length === 0) {
    separatorIndex += 1;
  }
  if (separatorIndex >= lines.length) {
    return null;
  }

  const separatorCells = parsePipeTableRow(lines[separatorIndex]!);
  if (!separatorCells || !isTableSeparatorRow(separatorCells)) {
    return null;
  }

  if (separatorCells.length !== headerCells.length) {
    return null;
  }

  const dataRows: string[][] = [];
  for (let i = separatorIndex + 1; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (line.length === 0) {
      continue;
    }

    const cells = parsePipeTableRow(line);
    if (!cells || isTableSeparatorRow(cells)) {
      break;
    }
    if (cells.length !== headerCells.length) {
      return null;
    }
    dataRows.push(cells);
  }

  return { headerCells, dataRows };
}

/** Parse multi-line GFM pipe table text; null when the clipboard is not a pipe table. */
export function parsePipeTableText(text: string): ParsedPipeTable | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim());

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i]!.length === 0) {
      continue;
    }

    const parsed = parsePipeTableBlockAt(lines, i);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function createTableDataCell(schema: Schema, value: string): ProseMirrorNode {
  const { tableCell, paragraph } = schema.nodes;
  if (!value) {
    return tableCell.createAndFill()!;
  }
  return tableCell.create(null, [paragraph.create(null, schema.text(value))]);
}

export function createTableFromPipeTable(
  schema: Schema,
  parsed: ParsedPipeTable,
): ProseMirrorNode {
  const { table, tableRow, tableHeader, paragraph } = schema.nodes;

  const headerRow = tableRow.create(
    null,
    parsed.headerCells.map((value) =>
      tableHeader.create(null, [
        paragraph.create(null, value ? schema.text(value) : undefined),
      ]),
    ),
  );

  const bodyRows =
    parsed.dataRows.length > 0
      ? parsed.dataRows
      : [parsed.headerCells.map(() => "")];

  const dataRows = bodyRows.map((cells) =>
    tableRow.create(
      null,
      cells.map((value) => createTableDataCell(schema, value)),
    ),
  );

  return table.create(null, [headerRow, ...dataRows]);
}

export function createTableWithHeaderRow(
  schema: Schema,
  headerCells: string[],
): ProseMirrorNode {
  return createTableFromPipeTable(schema, { headerCells, dataRows: [] });
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
  pos += 1;

  for (let col = 0; col < colIndex; col += 1) {
    pos += row.child(col).nodeSize;
  }

  pos += 1;

  const cell = row.child(colIndex);
  const paragraph = cell.firstChild;
  if (!paragraph?.isTextblock) {
    return;
  }

  tr.setSelection(TextSelection.create(tr.doc, pos + 1));
}
