import type { Editor } from "@tiptap/core";
import type { ResolvedPos } from "@tiptap/pm/model";
import { isTableShortcutContext } from "./tableKeyboardUtils";

/** True when the caret sits in an empty textblock (paragraph or code line). */
export function isEmptyTextblock($from: ResolvedPos): boolean {
  return $from.parent.isTextblock && $from.parent.content.size === 0;
}

/** Depth of the nearest blockquote ancestor, or null. */
export function findBlockquoteDepth($from: ResolvedPos): number | null {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === "blockquote") {
      return depth;
    }
  }
  return null;
}

/** True when the caret is in the last paragraph inside a blockquote. */
export function isLastParagraphInBlockquote($from: ResolvedPos): boolean {
  const depth = findBlockquoteDepth($from);
  if (depth === null) {
    return false;
  }

  const blockquote = $from.node(depth);
  return $from.index(depth) === blockquote.childCount - 1;
}

/** Enter on an empty trailing blockquote line should exit below the quote. */
export function shouldExitBlockquoteOnEnter(editor: Editor): boolean {
  if (!editor.isActive("blockquote")) {
    return false;
  }

  const { empty, $from } = editor.state.selection;
  if (!empty || !isEmptyTextblock($from)) {
    return false;
  }

  return isLastParagraphInBlockquote($from);
}

/** True when the caret is on an empty line inside a code block. */
export function isOnEmptyCodeLine($from: ResolvedPos): boolean {
  const parent = $from.parent;
  if (!parent.type.spec.code) {
    return false;
  }

  const textBefore = parent.textBetween(0, $from.parentOffset, undefined, "\n");
  const lastNewline = textBefore.lastIndexOf("\n");
  const currentLine =
    lastNewline === -1 ? textBefore : textBefore.slice(lastNewline + 1);
  return currentLine.length === 0;
}

/** True when the caret is at the end of a code block text node. */
export function isAtEndOfCodeBlock($from: ResolvedPos): boolean {
  const parent = $from.parent;
  if (!parent.type.spec.code) {
    return false;
  }
  return $from.parentOffset === parent.nodeSize - 2;
}

/** Enter on an empty trailing code line should exit below the fence. */
export function shouldExitCodeBlockOnEnter(editor: Editor): boolean {
  if (!editor.isActive("codeBlock")) {
    return false;
  }

  const { empty, $from } = editor.state.selection;
  if (!empty || $from.parent.type.name !== "codeBlock") {
    return false;
  }

  return isAtEndOfCodeBlock($from) && isOnEmptyCodeLine($from);
}

/**
 * Mod+Enter exits code blocks unless a higher-priority context owns the shortcut
 * (table row insert at 260, task toggle at 200).
 */
export function shouldExitCodeBlockOnModEnter(editor: Editor): boolean {
  if (!editor.isActive("codeBlock")) {
    return false;
  }

  if (isTableShortcutContext(editor) || editor.isActive("taskItem")) {
    return false;
  }

  return true;
}
