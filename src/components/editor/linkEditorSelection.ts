import type { Editor } from "@tiptap/react";

export interface SavedTextSelection {
  from: number;
  to: number;
}

let savedSelection: SavedTextSelection | null = null;

export function captureLinkEditorSelection(editor: Editor): void {
  const { from, to } = editor.state.selection;
  savedSelection = { from, to };
}

export function getSavedLinkEditorSelection(): SavedTextSelection | null {
  return savedSelection;
}

export function clearLinkEditorSelection(): void {
  savedSelection = null;
}

export function restoreLinkEditorSelection(editor: Editor): boolean {
  if (!savedSelection) return false;

  const { doc } = editor.state;
  const maxPos = doc.content.size;
  const from = Math.max(0, Math.min(savedSelection.from, maxPos));
  const to = Math.max(from, Math.min(savedSelection.to, maxPos));

  editor.commands.setTextSelection({ from, to });
  return true;
}
