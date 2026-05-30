import type { Node, ResolvedPos } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";

export interface LineBlockRange {
  from: number;
  to: number;
}

const LIST_ITEM_NODE_NAMES = new Set(["listItem", "taskItem"]);
const ATOMIC_BLOCK_NODE_NAMES = new Set(["blockquote", "codeBlock"]);

const BLOCKED_INTERIOR_NODE_NAMES = new Set(["tableCell", "tableHeader"]);

function isInsideBlockedInterior($from: ResolvedPos): boolean {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if (BLOCKED_INTERIOR_NODE_NAMES.has($from.node(depth).type.name)) {
      return true;
    }
  }
  return false;
}

function getNodeRange($from: ResolvedPos, depth: number): LineBlockRange {
  return {
    from: $from.before(depth),
    to: $from.after(depth),
  };
}

/** Nearest duplicate/delete block range for the caret, or null when blocked. */
export function getLineBlockRange($from: ResolvedPos): LineBlockRange | null {
  if (isInsideBlockedInterior($from)) {
    return null;
  }

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    const name = node.type.name;

    if (LIST_ITEM_NODE_NAMES.has(name)) {
      return getNodeRange($from, depth);
    }

    if (ATOMIC_BLOCK_NODE_NAMES.has(name)) {
      return getNodeRange($from, depth);
    }

    if (name === "heading") {
      return getNodeRange($from, depth);
    }

    if (name === "paragraph") {
      const parent = $from.node(depth - 1);
      if (parent.type.name === "doc") {
        return getNodeRange($from, depth);
      }
      continue;
    }
  }

  return null;
}

export function getDuplicatableBlockRange(
  $from: ResolvedPos,
): LineBlockRange | null {
  return getLineBlockRange($from);
}

export function getDeletableBlockRange(
  $from: ResolvedPos,
): LineBlockRange | null {
  return getLineBlockRange($from);
}

function firstChildBefore(parentFrom: number, parent: Node): number {
  return parent.type.name === "doc" ? parentFrom : parentFrom + 1;
}

function getChildIndexInParent(
  parentFrom: number,
  parent: Node,
  childBefore: number,
): number {
  let before = firstChildBefore(parentFrom, parent);
  for (let i = 0; i < parent.childCount; i += 1) {
    if (before === childBefore) {
      return i;
    }
    before += parent.child(i).nodeSize;
  }
  return -1;
}

function getParentBlockContext(
  doc: Node,
  range: LineBlockRange,
): { parent: Node; index: number; parentFrom: number } | null {
  const $pos = doc.resolve(range.from + 1);

  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.before(depth) !== range.from) {
      continue;
    }

    const parentDepth = depth - 1;
    const parent = parentDepth === 0 ? $pos.doc : $pos.node(parentDepth);
    const parentFrom = parentDepth === 0 ? 0 : $pos.before(parentDepth);
    const index = getChildIndexInParent(parentFrom, parent, range.from);
    if (index < 0) {
      return null;
    }
    return { parent, index, parentFrom };
  }

  return null;
}

function collapseEmptyListNodes(tr: Transaction): void {
  const toDelete: Array<{ from: number; to: number }> = [];

  tr.doc.descendants((node, pos) => {
    if (
      (node.type.name === "bulletList" ||
        node.type.name === "orderedList" ||
        node.type.name === "taskList") &&
      node.childCount === 0
    ) {
      toDelete.push({ from: pos, to: pos + node.nodeSize });
      return false;
    }
    return true;
  });

  toDelete.sort((a, b) => b.from - a.from);
  for (const { from, to } of toDelete) {
    tr.delete(from, to);
  }
}

function caretAtBlockTextStart(doc: Node, blockFrom: number): number {
  const clamped = Math.min(Math.max(0, blockFrom), doc.content.size);
  const $pos = doc.resolve(
    Math.min(clamped + 1, Math.max(1, doc.content.size - 1)),
  );

  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.node(depth).isTextblock) {
      return $pos.start(depth);
    }
  }

  return clamped + 1;
}

/** Prefer previous sibling textblock; else next; else block start. */
function selectionTargetAfterDelete(doc: Node, range: LineBlockRange): number {
  const context = getParentBlockContext(doc, range);
  if (!context) {
    return Math.max(1, Math.min(range.from, doc.content.size - 1));
  }

  const { parent, index, parentFrom } = context;

  if (index > 0) {
    let pos = firstChildBefore(parentFrom, parent);
    for (let i = 0; i < index - 1; i += 1) {
      pos += parent.child(i).nodeSize;
    }
    const prev = parent.child(index - 1);
    return caretAtBlockTextStart(doc, pos);
  }

  if (index + 1 < parent.childCount) {
    let pos = firstChildBefore(parentFrom, parent);
    for (let i = 0; i < index + 1; i += 1) {
      pos += parent.child(i).nodeSize;
    }
    return caretAtBlockTextStart(doc, pos);
  }

  return Math.max(1, Math.min(range.from, doc.content.size - 1));
}

function setSelectionAt(tr: Transaction, pos: number): void {
  const clamped = Math.min(Math.max(1, pos), tr.doc.content.size - 1);
  const $pos = tr.doc.resolve(clamped);
  if ($pos.parent.isTextblock) {
    tr.setSelection(TextSelection.create(tr.doc, clamped));
    return;
  }
  try {
    tr.setSelection(TextSelection.near($pos, 1));
  } catch {
    // Keep default mapped selection.
  }
}

/** Clone the current line/block below the source; caret moves into the duplicate. */
export function buildDuplicateLineTransaction(
  state: EditorState,
): Transaction | null {
  const { $from } = state.selection;
  const range = getLineBlockRange($from);
  if (!range) {
    return null;
  }

  const tr = state.tr;
  const slice = state.doc.slice(range.from, range.to);
  const insertPos = range.to;
  tr.insert(insertPos, slice.content);

  setSelectionAt(tr, caretAtBlockTextStart(tr.doc, insertPos));
  return tr;
}

/** Remove the current line/block; caret lands on previous sibling when possible. */
export function buildDeleteLineTransaction(
  state: EditorState,
): Transaction | null {
  const { $from } = state.selection;
  const range = getLineBlockRange($from);
  if (!range) {
    return null;
  }

  const target = selectionTargetAfterDelete(state.doc, range);
  const tr = state.tr;
  tr.delete(range.from, range.to);
  collapseEmptyListNodes(tr);
  setSelectionAt(tr, tr.mapping.map(target, -1));
  return tr;
}
