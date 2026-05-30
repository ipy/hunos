import type { Editor } from "@tiptap/react";

export interface SavedEditorSelection {
  from: number;
  to: number;
}

let savedSelection: SavedEditorSelection | null = null;

export function captureEditorOverlaySelection(editor: Editor): void {
  const { from, to } = editor.state.selection;
  savedSelection = { from, to };
}

export function getSavedEditorOverlaySelection(): SavedEditorSelection | null {
  return savedSelection;
}

export function clearEditorOverlaySelection(): void {
  savedSelection = null;
}

export function restoreEditorOverlaySelection(editor: Editor): boolean {
  if (!savedSelection || editor.isDestroyed) return false;

  const maxPos = editor.state.doc.content.size;
  const from = Math.max(0, Math.min(savedSelection.from, maxPos));
  const to = Math.max(from, Math.min(savedSelection.to, maxPos));

  return editor.commands.setTextSelection({ from, to });
}
