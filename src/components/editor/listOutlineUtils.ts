import type { Editor } from "@tiptap/core";

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
