import type { Node, ResolvedPos } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";

function getTaskListItemContext(
  $pos: ResolvedPos,
): { taskListDepth: number; taskItemDepth: number; itemIndex: number } | null {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    if ($pos.node(depth).type.name !== "taskItem") {
      continue;
    }

    const taskListDepth = depth - 1;
    if ($pos.node(taskListDepth).type.name !== "taskList") {
      return null;
    }

    return {
      taskListDepth,
      taskItemDepth: depth,
      itemIndex: $pos.index(taskListDepth),
    };
  }

  return null;
}

function reorderTaskItemInList(
  tr: Transaction,
  taskItemPos: number,
  targetIndex: number,
): boolean {
  const $pos = tr.doc.resolve(taskItemPos + 1);
  const context = getTaskListItemContext($pos);
  if (!context) {
    return false;
  }

  const { taskListDepth, itemIndex } = context;
  const taskListNode = $pos.node(taskListDepth);

  if (
    itemIndex === targetIndex ||
    targetIndex < 0 ||
    targetIndex >= taskListNode.childCount
  ) {
    return false;
  }

  const children: Node[] = [];
  taskListNode.forEach((child) => children.push(child));

  const [moved] = children.splice(itemIndex, 1);
  children.splice(targetIndex, 0, moved);

  const listFrom = $pos.before(taskListDepth);
  const listTo = $pos.after(taskListDepth);
  const newList = taskListNode.type.create(taskListNode.attrs, children);
  tr.replaceWith(listFrom, listTo, newList);

  return true;
}

function findFirstCheckedIndex(children: readonly Node[]): number {
  return children.findIndex((child) => child.attrs.checked);
}

/** Positions of task items that transitioned from unchecked to checked. */
export function findTaskItemsNewlyChecked(
  oldDoc: Node,
  newDoc: Node,
): number[] {
  const positions: number[] = [];

  oldDoc.descendants((oldNode, pos) => {
    if (oldNode.type.name !== "taskItem") {
      return;
    }

    const newNode = newDoc.nodeAt(pos);
    if (
      newNode?.type.name === "taskItem" &&
      !oldNode.attrs.checked &&
      newNode.attrs.checked
    ) {
      positions.push(pos);
    }
  });

  return positions;
}

/** Positions of task items that transitioned from checked to unchecked. */
export function findTaskItemsNewlyUnchecked(
  oldDoc: Node,
  newDoc: Node,
): number[] {
  const positions: number[] = [];

  oldDoc.descendants((oldNode, pos) => {
    if (oldNode.type.name !== "taskItem") {
      return;
    }

    const newNode = newDoc.nodeAt(pos);
    if (
      newNode?.type.name === "taskItem" &&
      oldNode.attrs.checked &&
      !newNode.attrs.checked
    ) {
      positions.push(pos);
    }
  });

  return positions;
}

/** Move a task item to the last slot in its parent task list. Returns false when already last. */
export function sinkTaskItemToListBottom(
  tr: Transaction,
  taskItemPos: number,
): boolean {
  const $pos = tr.doc.resolve(taskItemPos + 1);
  const context = getTaskListItemContext($pos);
  if (!context) {
    return false;
  }

  const taskListNode = $pos.node(context.taskListDepth);
  const lastIndex = taskListNode.childCount - 1;

  return reorderTaskItemInList(tr, taskItemPos, lastIndex);
}

/** Move an unchecked task item to the end of the open block (before completed items). */
export function floatTaskItemBeforeCompletedBlock(
  tr: Transaction,
  taskItemPos: number,
): boolean {
  const $pos = tr.doc.resolve(taskItemPos + 1);
  const context = getTaskListItemContext($pos);
  if (!context) {
    return false;
  }

  const taskListNode = $pos.node(context.taskListDepth);
  const children: Node[] = [];
  taskListNode.forEach((child) => children.push(child));

  const firstCheckedIndex = findFirstCheckedIndex(children);
  let targetIndex =
    firstCheckedIndex === -1 ? children.length - 1 : firstCheckedIndex;

  if (context.itemIndex < targetIndex) {
    targetIndex -= 1;
  }

  return reorderTaskItemInList(tr, taskItemPos, targetIndex);
}

/** Sink every newly checked task item to the bottom of its task list. */
export function applyCompletedTaskSink(
  tr: Transaction,
  positions: number[],
): boolean {
  let changed = false;

  for (const pos of [...positions].sort((a, b) => b - a)) {
    const mappedPos = tr.mapping.map(pos);
    if (sinkTaskItemToListBottom(tr, mappedPos)) {
      changed = true;
    }
  }

  return changed;
}

/** Float every newly unchecked task item before the completed block. */
export function applyOpenTaskFloat(
  tr: Transaction,
  positions: number[],
): boolean {
  let changed = false;

  for (const pos of [...positions].sort((a, b) => b - a)) {
    const mappedPos = tr.mapping.map(pos);
    if (floatTaskItemBeforeCompletedBlock(tr, mappedPos)) {
      changed = true;
    }
  }

  return changed;
}
