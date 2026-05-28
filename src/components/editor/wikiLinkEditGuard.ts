/** Briefly suppress wiki-link autocomplete after mousedown inside a rendered link. */
let suppressUntil = 0;

export function suppressWikiLinkSuggestionBriefly(ms = 150): void {
  suppressUntil = Date.now() + ms;
}

export function isWikiLinkSuggestionSuppressed(): boolean {
  return Date.now() < suppressUntil;
}
