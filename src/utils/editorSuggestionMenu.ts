const ESCAPE_CLOSE_SUPPRESS_MS = 100;
let suggestionMenuClosedByEscapeAt = 0;

/** Call when Escape closes a suggestion menu so focus mode is not exited on the same keypress. */
export function markSuggestionMenuClosedByEscape(): void {
  suggestionMenuClosedByEscapeAt = Date.now();
}

function didSuggestionMenuJustCloseByEscape(): boolean {
  return Date.now() - suggestionMenuClosedByEscapeAt < ESCAPE_CLOSE_SUPPRESS_MS;
}

/** True when a Hunos tag/wiki autocomplete menu is mounted and visible. */
export function isEditorSuggestionMenuOpen(): boolean {
  const menu = document.querySelector('[data-hunos-editor-suggestion="true"]');
  if (!(menu instanceof HTMLElement) || !menu.isConnected) return false;
  return menu.getBoundingClientRect().height > 0;
}

/** True when Escape should not exit focus mode (menu open or just closed by Escape). */
export function shouldSuppressFocusModeEscape(): boolean {
  return isEditorSuggestionMenuOpen() || didSuggestionMenuJustCloseByEscape();
}
