import type { Node, ResolvedPos } from "@tiptap/pm/model";
import { Slice } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";

export type BlockMoveDirection = "up" | "down";

export interface MovableBlockRange {
  from: number;
  to: number;
}

const LIST_ITEM_NODE_NAMES = new Set(["listItem", "taskItem"]);
const ATOMIC_BLOCK_NODE_NAMES = new Set([
  "blockquote",
  "codeBlock",
  "horizontalRule",
]);

function isSingleParagraphBlockquote(node: Node): boolean {
  return (
    node.type.name === "blockquote" &&
    node.childCount === 1 &&
    node.firstChild?.type.name === "paragraph"
  );
}

const BLOCKED_INTERIOR_NODE_NAMES = new Set(["tableCell", "tableHeader"]);

function isInsideBlockedInterior($from: ResolvedPos): boolean {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if (BLOCKED_INTERIOR_NODE_NAMES.has($from.node(depth).type.name)) {
      return true;
    }
  }
  return false;
}

function getHeadingSectionRange(
  $from: ResolvedPos,
  headingDepth: number,
): MovableBlockRange {
  const headingNode = $from.node(headingDepth);
  const level = headingNode.attrs.level;
  const from = $from.before(headingDepth);
  const parentDepth = headingDepth - 1;
  const parent = parentDepth === 0 ? $from.doc : $from.node(parentDepth);
  const parentFrom = parentDepth === 0 ? 0 : $from.before(parentDepth);
  const index = getChildIndexInParent(parentFrom, parent, from);
  let to = from + headingNode.nodeSize;

  for (let i = index + 1; i < parent.childCount; i += 1) {
    const sibling = parent.child(i);
    if (sibling.type.name === "heading" && sibling.attrs.level <= level) {
      break;
    }
    to += sibling.nodeSize;
  }

  return { from, to };
}

function getNodeRange($from: ResolvedPos, depth: number): MovableBlockRange {
  return {
    from: $from.before(depth),
    to: $from.after(depth),
  };
}

/** Nearest movable block range for the caret, or null when move is blocked. */
export function getMovableBlockRange(
  $from: ResolvedPos,
): MovableBlockRange | null {
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
      if (name === "blockquote" && isSingleParagraphBlockquote(node)) {
        return null;
      }
      return getNodeRange($from, depth);
    }

    if (name === "heading") {
      return getHeadingSectionRange($from, depth);
    }

    if (name === "paragraph") {
      const parent = $from.node(depth - 1);
      if (
        parent.type.name === "doc" ||
        parent.type.name === "blockquote" ||
        parent.type.name === "listItem" ||
        parent.type.name === "taskItem"
      ) {
        if (parent.type.name === "doc") {
          return getNodeRange($from, depth);
        }
        continue;
      }
    }
  }

  return null;
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
  range: MovableBlockRange,
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

function getSiblingRange(
  doc: Node,
  parentFrom: number,
  parent: Node,
  index: number,
): MovableBlockRange {
  let from = firstChildBefore(parentFrom, parent);
  for (let i = 0; i < index; i += 1) {
    from += parent.child(i).nodeSize;
  }
  const node = parent.child(index);
  return { from, to: from + node.nodeSize };
}

function getHeadingDepthForRange(
  doc: Node,
  range: MovableBlockRange,
): number | null {
  const $pos = doc.resolve(range.from + 1);
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if (
      $pos.before(depth) === range.from &&
      $pos.node(depth).type.name === "heading"
    ) {
      return depth;
    }
  }
  return null;
}

function childPosAtIndex(
  parentFrom: number,
  parent: Node,
  index: number,
): number {
  let pos = firstChildBefore(parentFrom, parent);
  for (let i = 0; i < index; i += 1) {
    pos += parent.child(i).nodeSize;
  }
  return pos;
}

function getPreviousHeadingSectionRange(
  doc: Node,
  range: MovableBlockRange,
): MovableBlockRange | null {
  const headingDepth = getHeadingDepthForRange(doc, range);
  if (headingDepth === null) {
    return null;
  }

  const $from = doc.resolve(range.from + 1);
  const parentDepth = headingDepth - 1;
  const parent = parentDepth === 0 ? doc : $from.node(parentDepth);
  const parentFrom = parentDepth === 0 ? 0 : $from.before(parentDepth);
  const index = getChildIndexInParent(parentFrom, parent, range.from);
  if (index <= 0) {
    return null;
  }

  for (let i = index - 1; i >= 0; i -= 1) {
    const child = parent.child(i);
    if (child.type.name === "heading") {
      const childFrom = childPosAtIndex(parentFrom, parent, i);
      return getHeadingSectionRange(doc.resolve(childFrom + 1), headingDepth);
    }
  }

  return null;
}

function getNextHeadingSectionRange(
  doc: Node,
  range: MovableBlockRange,
): MovableBlockRange | null {
  const headingDepth = getHeadingDepthForRange(doc, range);
  if (headingDepth === null) {
    return null;
  }

  if (range.to >= doc.content.size) {
    return null;
  }

  const $from = doc.resolve(range.from + 1);
  const parentDepth = headingDepth - 1;
  const parent = parentDepth === 0 ? doc : $from.node(parentDepth);
  const parentFrom = parentDepth === 0 ? 0 : $from.before(parentDepth);
  const currentIndex = getChildIndexInParent(parentFrom, parent, range.from);

  let pos = firstChildBefore(parentFrom, parent);
  for (let i = 0; i <= currentIndex; i += 1) {
    pos += parent.child(i).nodeSize;
  }

  for (let i = currentIndex + 1; i < parent.childCount; i += 1) {
    const child = parent.child(i);
    if (child.type.name === "heading") {
      return getHeadingSectionRange(doc.resolve(pos + 1), headingDepth);
    }
    pos += child.nodeSize;
  }

  return null;
}

function getAdjacentRange(
  doc: Node,
  range: MovableBlockRange,
  direction: BlockMoveDirection,
): MovableBlockRange | null {
  if (getHeadingDepthForRange(doc, range) !== null) {
    if (direction === "up") {
      return getPreviousHeadingSectionRange(doc, range);
    }

    // AC7: Mod+Alt+Down on a heading section swaps with the section above when present.
    const previousSection = getPreviousHeadingSectionRange(doc, range);
    if (previousSection) {
      return previousSection;
    }
    return getNextHeadingSectionRange(doc, range);
  }

  const context = getParentBlockContext(doc, range);
  if (!context) {
    return null;
  }

  const { parent, index, parentFrom } = context;
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= parent.childCount) {
    return null;
  }

  return getSiblingRange(doc, parentFrom, parent, targetIndex);
}

function isNestedListItemRange(doc: Node, range: MovableBlockRange): boolean {
  const $from = doc.resolve(range.from + 1);
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const name = $from.node(depth).type.name;
    if (!LIST_ITEM_NODE_NAMES.has(name)) {
      continue;
    }
    if (depth >= 2) {
      const ancestor = $from.node(depth - 2);
      if (LIST_ITEM_NODE_NAMES.has(ancestor.type.name)) {
        return true;
      }
    }
    return false;
  }
  return false;
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

function swapAdjacentRanges(
  tr: Transaction,
  first: MovableBlockRange,
  second: MovableBlockRange,
): void {
  const doc = tr.doc;
  const firstSlice = doc.slice(first.from, first.to);
  const secondSlice = doc.slice(second.from, second.to);
  const combinedFrom = Math.min(first.from, second.from);
  const combinedTo = Math.max(first.to, second.to);

  tr.replace(
    combinedFrom,
    combinedTo,
    new Slice(
      first.from < second.from
        ? secondSlice.content.append(firstSlice.content)
        : firstSlice.content.append(secondSlice.content),
      0,
      0,
    ),
  );
}

function buildLiftNestedListItemDownTransaction(
  state: EditorState,
  range: MovableBlockRange,
): Transaction | null {
  const $from = state.doc.resolve(range.from + 1);
  let listItemDepth: number | null = null;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if (LIST_ITEM_NODE_NAMES.has($from.node(depth).type.name)) {
      listItemDepth = depth;
      break;
    }
  }
  if (listItemDepth === null || listItemDepth < 3) {
    return null;
  }

  const listDepth = listItemDepth - 1;
  const parentListItemDepth = listDepth - 1;
  const parentListItem = $from.node(parentListItemDepth);
  if (!LIST_ITEM_NODE_NAMES.has(parentListItem.type.name)) {
    return null;
  }

  const tr = state.tr;
  const insertPos = $from.after(parentListItemDepth);
  const itemSlice = state.doc.slice(range.from, range.to);
  const nestedList = $from.node(listDepth);

  if (nestedList.childCount === 1) {
    const listFrom = $from.before(listDepth);
    const listTo = $from.after(listDepth);
    tr.delete(listFrom, listTo);
  } else {
    tr.delete(range.from, range.to);
    collapseEmptyListNodes(tr);
  }

  tr.insert(tr.mapping.map(insertPos), itemSlice.content);
  return tr;
}

function preserveSelectionInRange(
  tr: Transaction,
  range: MovableBlockRange,
  originalPos: number,
): void {
  const mappedFrom = tr.mapping.map(range.from);
  const mappedTo = tr.mapping.map(range.to, -1);
  const movedSize = Math.max(1, mappedTo - mappedFrom);
  const offset = Math.min(Math.max(0, originalPos - range.from), movedSize - 1);
  const target = Math.min(
    Math.max(1, mappedFrom + offset),
    tr.doc.content.size - 1,
  );

  try {
    tr.setSelection(TextSelection.near(tr.doc.resolve(target)));
  } catch {
    // Keep the mapped default selection when the exact offset is invalid.
  }
}

function isLastListItemInParentList(
  doc: Node,
  range: MovableBlockRange,
): boolean {
  const context = getParentBlockContext(doc, range);
  if (!context) {
    return false;
  }

  const { parent, index } = context;
  const listType = parent.type.name;
  if (
    listType !== "bulletList" &&
    listType !== "orderedList" &&
    listType !== "taskList"
  ) {
    return false;
  }

  return index === parent.childCount - 1;
}

/** True when the block can move in the given direction. */
export function canMoveBlock(
  doc: Node,
  range: MovableBlockRange,
  direction: BlockMoveDirection,
): boolean {
  if (getAdjacentRange(doc, range, direction)) {
    return true;
  }

  return (
    direction === "down" &&
    isNestedListItemRange(doc, range) &&
    isLastListItemInParentList(doc, range)
  );
}

/** Build a transaction that swaps the movable block, or null when move is blocked. */
export function buildMoveBlockTransaction(
  state: EditorState,
  direction: BlockMoveDirection,
): Transaction | null {
  const { $from } = state.selection;
  const range = getMovableBlockRange($from);
  if (!range || !canMoveBlock(state.doc, range, direction)) {
    return null;
  }

  const adjacent = getAdjacentRange(state.doc, range, direction);
  if (adjacent) {
    const tr = state.tr;
    const first = direction === "up" ? adjacent : range;
    const second = direction === "up" ? range : adjacent;
    swapAdjacentRanges(tr, first, second);
    preserveSelectionInRange(tr, range, $from.pos);
    return tr;
  }

  if (direction === "down" && isNestedListItemRange(state.doc, range)) {
    const tr = buildLiftNestedListItemDownTransaction(state, range);
    if (tr) {
      preserveSelectionInRange(tr, range, $from.pos);
      return tr;
    }
  }

  return null;
}
