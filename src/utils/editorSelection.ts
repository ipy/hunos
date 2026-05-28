import type { Editor } from '@tiptap/react';

export function editorHasNonEmptySelection(editor: Editor | null): boolean {
  return editor != null && !editor.state.selection.empty && editor.isFocused;
}

export function collapseEditorSelection(editor: Editor): boolean {
  const { from } = editor.state.selection;
  return editor.chain().focus().setTextSelection(from).run();
}
