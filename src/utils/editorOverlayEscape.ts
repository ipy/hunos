export interface EditorOverlayState {
  showActions: boolean;
  showStats: boolean;
}

export interface EditorOverlayDismissHandlers {
  closeActions: () => void;
  closeStats: () => void;
}

/** Returns true when Escape closed an editor overlay (actions menu or stats panel). */
export function dismissEditorOverlayOnEscape(
  key: string,
  overlays: EditorOverlayState,
  handlers: EditorOverlayDismissHandlers,
): boolean {
  if (key !== "Escape") return false;
  if (overlays.showActions) {
    handlers.closeActions();
    return true;
  }
  if (overlays.showStats) {
    handlers.closeStats();
    return true;
  }
  return false;
}
