import { useUIStore } from "@/store/uiStore";

let suppressFocusModeExitThisEscape = false;

/** Call when Escape closes a suggestion menu so focus mode is not exited on the same keypress. */
export function markSuggestionMenuClosedByEscape(): void {
  suppressFocusModeExitThisEscape = true;
  queueMicrotask(() => {
    suppressFocusModeExitThisEscape = false;
  });
}

/** True only for the Escape keypress that just closed a suggestion menu (not while menu is open). */
export function shouldSuppressFocusModeExitAfterMenuClose(): boolean {
  return suppressFocusModeExitThisEscape;
}

/** True when a Hunos tag/wiki autocomplete menu is mounted and visible. */
export function isEditorSuggestionMenuOpen(): boolean {
  const menu = document.querySelector('[data-hunos-editor-suggestion="true"]');
  if (!(menu instanceof HTMLElement) || !menu.isConnected) return false;
  return menu.getBoundingClientRect().height > 0;
}

/** True when the inline link URL editor bubble is open. */
export function isLinkEditorOpen(): boolean {
  return useUIStore.getState().linkEditorOpen;
}

/** True when the window-level Escape handler should not exit focus mode. */
export function shouldSuppressFocusModeEscape(): boolean {
  return (
    isEditorSuggestionMenuOpen() ||
    isLinkEditorOpen() ||
    suppressFocusModeExitThisEscape
  );
}
