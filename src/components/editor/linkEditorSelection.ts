import type { Editor } from "@tiptap/react";

export interface SavedTextSelection {
  from: number;
  to: number;
}

let savedSelection: SavedTextSelection | null = null;

function toDomRect(left: number, top: number, width = 1, height = 1): DOMRect {
  const DOMRectCtor = globalThis.DOMRect;
  if (typeof DOMRectCtor === "function") {
    return new DOMRectCtor(left, top, width, height);
  }
  return { left, top, width, height } as DOMRect;
}

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
  if (!savedSelection || editor.isDestroyed) return false;

  const { doc } = editor.state;
  const maxPos = doc.content.size;
  const from = Math.max(0, Math.min(savedSelection.from, maxPos));
  const to = Math.max(from, Math.min(savedSelection.to, maxPos));

  editor.commands.setTextSelection({ from, to });
  return true;
}

export function getLinkEditorAnchorRect(editor: Editor): DOMRect | null {
  if (editor.isDestroyed) return null;

  const docSize = editor.state.doc.content.size;
  const pos = savedSelection
    ? Math.min(Math.max(savedSelection.from, savedSelection.to), docSize)
    : Math.min(editor.state.selection.to, docSize);

  try {
    const coords = editor.view.coordsAtPos(Math.max(1, pos));
    return toDomRect(
      coords.left,
      coords.top,
      Math.max(coords.right - coords.left, 1),
      Math.max(coords.bottom - coords.top, 1),
    );
  } catch {
    const bounds = editor.view.dom.getBoundingClientRect();
    return toDomRect(bounds.left + 24, bounds.top + 48);
  }
}
