import type { Editor } from "@tiptap/core";
import type { ResolvedPos } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";

const focusedTaskCheckboxByEditor = new WeakMap<Editor, number>();

export function setFocusedTaskCheckboxPos(
  editor: Editor,
  pos: number | null,
): void {
  if (pos === null) {
    focusedTaskCheckboxByEditor.delete(editor);
    return;
  }

  focusedTaskCheckboxByEditor.set(editor, pos);
}

export function getFocusedTaskCheckboxPos(editor: Editor): number | null {
  return focusedTaskCheckboxByEditor.get(editor) ?? null;
}

/** Remap stored checkbox position after a transaction that may reorder task items. */
export function resyncFocusedTaskCheckboxPos(
  editor: Editor,
  tr: Transaction,
): void {
  const focusedPos = getFocusedTaskCheckboxPos(editor);
  if (focusedPos === null) {
    return;
  }

  setFocusedTaskCheckboxPos(editor, tr.mapping.map(focusedPos));
}

export function isTaskCheckboxFocused(editor: Editor): boolean {
  return getFocusedTaskCheckboxPos(editor) !== null;
}

export function findTaskItemPosFromResolvedPos(
  $from: ResolvedPos,
  taskItemName: string,
): number | null {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === taskItemName) {
      return $from.before(depth);
    }
  }
  return null;
}

export function resolveTaskItemPosForToggle(
  editor: Editor,
  taskItemName: string,
  $from: ResolvedPos,
): number | null {
  const fromSelection = findTaskItemPosFromResolvedPos($from, taskItemName);
  if (fromSelection !== null) {
    return fromSelection;
  }

  return getFocusedTaskCheckboxPos(editor);
}

export function isTaskItemToggleContext(
  editor: Editor,
  taskItemName = "taskItem",
): boolean {
  if (editor.isActive(taskItemName)) {
    return true;
  }

  return isTaskCheckboxFocused(editor);
}

export function isModEnterKeyboardEvent(event: KeyboardEvent): boolean {
  return (
    (event.metaKey || event.ctrlKey) &&
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.altKey
  );
}
