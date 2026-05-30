import type { Editor } from "@tiptap/core";

const LIST_BLOCK_TYPES = new Set(["bulletList", "orderedList", "taskList"]);

/** True when the caret is at the end of a heading immediately before a list block. */
export function isCaretAtHeadingEndBeforeList(editor: Editor): boolean {
  const { $from } = editor.state.selection;
  if (!$from.parent.type.name.startsWith("heading")) {
    return false;
  }
  if ($from.parentOffset !== $from.parent.content.size) {
    return false;
  }

  const afterHeading = $from.after($from.depth);
  const nextNode = editor.state.doc.nodeAt(afterHeading);
  return Boolean(nextNode && LIST_BLOCK_TYPES.has(nextNode.type.name));
}

/** Insert a paragraph between a heading and the list that immediately follows it. */
export function insertParagraphBetweenHeadingAndList(editor: Editor): boolean {
  if (!isCaretAtHeadingEndBeforeList(editor)) {
    return false;
  }

  const afterHeading = editor.state.selection.$from.after(
    editor.state.selection.$from.depth,
  );

  return editor
    .chain()
    .focus()
    .insertContentAt(afterHeading, { type: "paragraph" })
    .setTextSelection(afterHeading + 1)
    .run();
}
