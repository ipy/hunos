import type { Editor } from "@tiptap/core";
import type { ResolvedPos } from "@tiptap/pm/model";

export type OutlineListItemType = "listItem" | "taskItem";

const BLOCKED_OUTLINE_NODE_NAMES = new Set([
  "codeBlock",
  "blockquote",
  "table",
  "tableCell",
  "tableHeader",
]);

function isInBlockedOutlineContext(editor: Editor): boolean {
  for (const name of BLOCKED_OUTLINE_NODE_NAMES) {
    if (editor.isActive(name)) {
      return true;
    }
  }
  return false;
}

/** When true, Tab should not indent and must fall through to suggestion menus. */
export function shouldDeferTabToSuggestionMenu(
  sink: boolean,
  isSuggestionMenuOpen: boolean,
): boolean {
  return sink && isSuggestionMenuOpen;
}

/** Active list item node type when Tab / Shift+Tab outlining is allowed, else null. */
export function getOutlineListItemType(
  editor: Editor,
): OutlineListItemType | null {
  if (isInBlockedOutlineContext(editor)) {
    return null;
  }

  if (editor.isActive("taskItem")) {
    return "taskItem";
  }

  if (editor.isActive("listItem")) {
    return "listItem";
  }

  return null;
}

export function isEditorFocusedForOutline(editor: Editor): boolean {
  const { dom } = editor.view;
  if (editor.view.hasFocus()) {
    return true;
  }

  const active = document.activeElement;
  return active instanceof Node && dom.contains(active);
}

/** Depth of the nearest list item / task item ancestor, or null when absent. */
export function findListItemDepth(
  $from: ResolvedPos,
  itemTypeName: OutlineListItemType,
): number | null {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === itemTypeName) {
      return depth;
    }
  }
  return null;
}

/** True when the list item sits inside another item of the same type. */
export function isNestedListItem(
  $from: ResolvedPos,
  itemTypeName: OutlineListItemType,
): boolean {
  const depth = findListItemDepth($from, itemTypeName);
  if (depth === null || depth < 2) {
    return false;
  }
  return $from.node(depth - 2).type.name === itemTypeName;
}

/** True when the list item's primary textblock has no content. */
export function isListItemEmpty(
  $from: ResolvedPos,
  itemTypeName: OutlineListItemType,
): boolean {
  const depth = findListItemDepth($from, itemTypeName);
  if (depth === null) {
    return false;
  }
  const listItem = $from.node(depth);
  const firstChild = listItem.firstChild;
  if (!firstChild?.isTextblock) {
    return false;
  }
  return firstChild.content.size === 0;
}

/** True when the caret is at the start of the list item's primary textblock. */
export function isAtListItemStart(
  $from: ResolvedPos,
  itemTypeName: OutlineListItemType,
): boolean {
  const depth = findListItemDepth($from, itemTypeName);
  if (depth === null) {
    return false;
  }

  const listItem = $from.node(depth);
  const firstChild = listItem.firstChild;
  if (!firstChild?.isTextblock) {
    return false;
  }

  const textblockDepth = depth + 1;
  const contentStart =
    $from.depth >= textblockDepth
      ? $from.start(textblockDepth)
      : $from.start(depth);
  const contentEnd = contentStart + firstChild.content.size;

  if ($from.pos < contentStart || $from.pos > contentEnd) {
    return false;
  }

  return $from.pos === contentStart;
}
