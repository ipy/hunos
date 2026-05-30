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

export function hasSavedEditorOverlaySelection(): boolean {
  return savedSelection !== null;
}

export function clearEditorOverlaySelection(): void {
  savedSelection = null;
}

function clampSavedSelection(editor: Editor): SavedEditorSelection | null {
  if (!savedSelection || editor.isDestroyed) return null;

  const maxPos = editor.state.doc.content.size;
  const from = Math.max(0, Math.min(savedSelection.from, maxPos));
  const to = Math.max(from, Math.min(savedSelection.to, maxPos));
  return { from, to };
}

/** Focus the editor and restore overlay selection in a single transaction. */
export function focusEditorWithOverlaySelection(editor: Editor): boolean {
  if (editor.isDestroyed) return false;

  const selection = clampSavedSelection(editor);
  if (!selection) {
    return editor.commands.focus();
  }

  return editor
    .chain()
    .focus()
    .setTextSelection({ from: selection.from, to: selection.to })
    .run();
}

/** @deprecated Prefer focusEditorWithOverlaySelection for toolbar commands. */
export function restoreEditorOverlaySelection(editor: Editor): boolean {
  if (editor.isDestroyed) return false;

  const selection = clampSavedSelection(editor);
  if (!selection) return false;

  return editor.commands.setTextSelection(selection);
}

export function runToolbarActionWithOverlaySelection(
  editor: Editor,
  formatOverlayOpen: boolean,
  action: (editor: Editor) => void,
): void {
  if (formatOverlayOpen && hasSavedEditorOverlaySelection()) {
    focusEditorWithOverlaySelection(editor);
  }
  action(editor);
}
