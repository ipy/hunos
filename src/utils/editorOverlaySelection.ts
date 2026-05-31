import type { ChainedCommands, Editor } from "@tiptap/react";

export interface SavedEditorSelection {
  from: number;
  to: number;
}

let savedSelection: SavedEditorSelection | null = null;
let toolbarFormatOverlayOpen = false;
let editorFormatOverlayPanelOpen = false;

/** Stats / more-actions panel open — drives bookmark sync and bubble-menu suppression. */
export function setEditorFormatOverlayPanelOpen(open: boolean): void {
  editorFormatOverlayPanelOpen = open;
}

export function isEditorFormatOverlayPanelOpen(): boolean {
  return editorFormatOverlayPanelOpen;
}

export function captureEditorOverlaySelection(editor: Editor): void {
  const { from, to } = editor.state.selection;
  savedSelection = { from, to };
}

function isEditorSelectionCollapsed(editor: Editor): boolean {
  const { from, to } = editor.state.selection;
  return from === to;
}

/** Use the overlay bookmark when the live range collapsed (e.g. toolbar blur). */
export function shouldUseSavedToolbarSelection(editor: Editor): boolean {
  return (
    hasNonEmptySavedEditorOverlaySelection() &&
    isEditorSelectionCollapsed(editor)
  );
}

/** Keep the toolbar bookmark aligned with non-empty editor selections. */
export function attachEditorOverlaySelectionSync(editor: Editor): () => void {
  const onSelectionUpdate = () => {
    const { from, to } = editor.state.selection;
    if (from === to) return;

    if (editorFormatOverlayPanelOpen) {
      savedSelection = { from, to };
      return;
    }

    if (hasNonEmptySavedEditorOverlaySelection()) {
      clearEditorOverlaySelection();
    }
  };
  editor.on("selectionUpdate", onSelectionUpdate);
  return () => {
    editor.off("selectionUpdate", onSelectionUpdate);
  };
}

/** Prefer a live non-empty range; keep the overlay bookmark when the editor blurred. */
export function syncEditorOverlaySelectionBeforeToolbarCommand(
  editor: Editor,
): void {
  if (editor.isDestroyed) return;

  const { from, to } = editor.state.selection;
  if (from !== to) {
    savedSelection = { from, to };
    return;
  }

  if (
    !hasSavedEditorOverlaySelection() &&
    editorFormatOverlayPanelOpen
  ) {
    captureEditorOverlaySelection(editor);
  }
}

export function getSavedEditorOverlaySelection(): SavedEditorSelection | null {
  return savedSelection;
}

export function hasSavedEditorOverlaySelection(): boolean {
  return savedSelection !== null;
}

export function hasNonEmptySavedEditorOverlaySelection(): boolean {
  return savedSelection !== null && savedSelection.from !== savedSelection.to;
}

export function clearEditorOverlaySelection(): void {
  savedSelection = null;
}

export function isToolbarFormatOverlayOpen(): boolean {
  return toolbarFormatOverlayOpen;
}

/** Document position for toolbar list/mark commands while an overlay has focus. */
export function getOverlayToolbarAnchorPos(editor: Editor): number {
  if (isToolbarFormatOverlayOpen() || shouldUseSavedToolbarSelection(editor)) {
    const selection = clampSavedSelection(editor);
    if (selection) {
      return selection.from;
    }
  }
  return editor.state.selection.from;
}

function clampSavedSelection(editor: Editor): SavedEditorSelection | null {
  if (!savedSelection || editor.isDestroyed) return null;

  const maxPos = editor.state.doc.content.size;
  const from = Math.max(0, Math.min(savedSelection.from, maxPos));
  const to = Math.max(from, Math.min(savedSelection.to, maxPos));
  return { from, to };
}

/**
 * Push the overlay bookmark into the editor before the panel closes.
 * Keeps the bookmark so post-dismiss toolbar commands survive editor blur.
 */
export function restoreEditorSelectionOnOverlayDismiss(
  editor: Editor,
): boolean {
  if (editor.isDestroyed || !hasSavedEditorOverlaySelection()) {
    return false;
  }

  const selection = clampSavedSelection(editor);
  if (!selection) {
    clearEditorOverlaySelection();
    return false;
  }

  return editor
    .chain()
    .focus()
    .setTextSelection({ from: selection.from, to: selection.to })
    .run();
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

/** @deprecated Prefer runToolbarChain for toolbar commands. */
export function restoreEditorOverlaySelection(editor: Editor): boolean {
  if (editor.isDestroyed) return false;

  const selection = clampSavedSelection(editor);
  if (!selection) return false;

  return editor.commands.setTextSelection(selection);
}

/** Run a toolbar command in one chain, restoring overlay selection before the command. */
export function runToolbarChain(
  editor: Editor,
  formatOverlayOpen: boolean,
  build: (chain: ChainedCommands) => ChainedCommands,
): boolean {
  if (editor.isDestroyed) return false;

  let chain = editor.chain();
  const useSavedSelection =
    (formatOverlayOpen && hasSavedEditorOverlaySelection()) ||
    shouldUseSavedToolbarSelection(editor);
  if (useSavedSelection) {
    const selection = clampSavedSelection(editor);
    if (selection) {
      return build(
        chain.focus().setTextSelection({
          from: selection.from,
          to: selection.to,
        }),
      ).run();
    }
  }

  return build(chain.focus()).run();
}

export function runToolbarActionWithOverlaySelection(
  editor: Editor,
  formatOverlayOpen: boolean,
  action: (editor: Editor) => void,
): void {
  toolbarFormatOverlayOpen = formatOverlayOpen;
  try {
    syncEditorOverlaySelectionBeforeToolbarCommand(editor);
    action(editor);
  } finally {
    toolbarFormatOverlayOpen = false;
  }
}
