import type { ResolvedPos } from "@tiptap/pm/model";
import type { EditorState, Selection, Transaction } from "@tiptap/pm/state";
import { AllSelection, TextSelection } from "@tiptap/pm/state";

export interface SelectAllScopeRange {
  from: number;
  to: number;
}

const TABLE_CELL_NODE_NAMES = new Set(["tableCell", "tableHeader"]);
const LIST_ITEM_NODE_NAMES = new Set(["listItem", "taskItem"]);
const INLINE_TEXT_CONTAINER_NAMES = new Set([
  ...LIST_ITEM_NODE_NAMES,
  "blockquote",
]);

function getInlineTextRangeInContainer(
  $from: ResolvedPos,
  depth: number,
): SelectAllScopeRange {
  const containerStart = $from.start(depth);
  let from: number | null = null;
  let to: number | null = null;

  $from.node(depth).descendants((node, pos) => {
    if (!node.isText) {
      return;
    }

    const textFrom = containerStart + pos;
    const textTo = textFrom + node.nodeSize;
    from = from === null ? textFrom : from;
    to = textTo;
  });

  if (from !== null && to !== null) {
    return { from, to };
  }

  return { from: $from.start(depth), to: $from.end(depth) };
}

function getTableCellTextRange(
  $from: ResolvedPos,
  depth: number,
): SelectAllScopeRange {
  const cellStart = $from.start(depth);
  let from: number | null = null;
  let to: number | null = null;

  $from.node(depth).descendants((node, pos) => {
    if (!node.isTextblock) {
      return;
    }

    const blockStart = cellStart + pos + 1;
    const blockEnd = blockStart + node.content.size;
    from = from === null ? blockStart : from;
    to = blockEnd;
  });

  if (from !== null && to !== null) {
    return { from, to };
  }

  return { from: $from.start(depth), to: $from.end(depth) };
}

/** Nearest Bear-style select-all scope for the caret, or null to fall back to whole note. */
export function getSelectAllScopeRange(
  $from: ResolvedPos,
): SelectAllScopeRange | null {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    const name = node.type.name;

    if (TABLE_CELL_NODE_NAMES.has(name)) {
      return getTableCellTextRange($from, depth);
    }

    if (name === "codeBlock") {
      return { from: $from.start(depth), to: $from.end(depth) };
    }

    if (INLINE_TEXT_CONTAINER_NAMES.has(name)) {
      return getInlineTextRangeInContainer($from, depth);
    }

    if (name === "heading") {
      return { from: $from.start(depth), to: $from.end(depth) };
    }

    if (name === "paragraph") {
      const parent = $from.node(depth - 1);
      if (parent.type.name === "doc") {
        return { from: $from.start(depth), to: $from.end(depth) };
      }
    }
  }

  return null;
}

export function isEntireDocumentSelected(selection: Selection): boolean {
  return selection instanceof AllSelection;
}

export function isSelectAllScopeFullySelected(
  selection: Selection,
  scope: SelectAllScopeRange,
): boolean {
  if (selection instanceof AllSelection) {
    return false;
  }

  return selection.from === scope.from && selection.to === scope.to;
}

/** First Mod+A selects scope; second selects the whole note. */
export function buildSelectAllTransaction(
  state: EditorState,
): Transaction | null {
  const { doc, selection } = state;

  if (isEntireDocumentSelected(selection)) {
    return null;
  }

  const scope = getSelectAllScopeRange(selection.$from);
  const tr = state.tr;

  if (!scope || !isSelectAllScopeFullySelected(selection, scope)) {
    if (!scope) {
      tr.setSelection(new AllSelection(doc));
      return tr;
    }

    tr.setSelection(TextSelection.create(doc, scope.from, scope.to));
    return tr;
  }

  tr.setSelection(new AllSelection(doc));
  return tr;
}
