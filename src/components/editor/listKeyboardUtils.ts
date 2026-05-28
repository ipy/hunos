import type { Editor } from "@tiptap/core";
import {
  getOutlineListItemType,
  isAtListItemStart,
  isListItemEmpty,
  isNestedListItem,
  type OutlineListItemType,
} from "./listOutlineUtils";

export type ListKeyboardAction = "outdent" | "exit";

export function resolveEmptyEnterAction(
  editor: Editor,
): ListKeyboardAction | null {
  const itemType = getOutlineListItemType(editor);
  if (!itemType) {
    return null;
  }

  const { $from } = editor.state.selection;
  if (!isListItemEmpty($from, itemType)) {
    return null;
  }

  return isNestedListItem($from, itemType) ? "outdent" : "exit";
}

export function resolveBackspaceStartAction(
  editor: Editor,
): ListKeyboardAction | null {
  const itemType = getOutlineListItemType(editor);
  if (!itemType) {
    return null;
  }

  const { $from } = editor.state.selection;
  if (!isAtListItemStart($from, itemType)) {
    return null;
  }

  if (isListItemEmpty($from, itemType)) {
    return isNestedListItem($from, itemType) ? "outdent" : "exit";
  }

  if (isNestedListItem($from, itemType)) {
    return "outdent";
  }

  return null;
}

export function applyListKeyboardAction(
  editor: Editor,
  itemType: OutlineListItemType,
): boolean {
  return editor.commands.liftListItem(itemType);
}
