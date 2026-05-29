/** Document-position span for a closed `[[title]]` wiki-link. */
export interface WikiLinkDocSpan {
  start: number;
  end: number;
}

export function isPosInsideWikiLinkSpan(
  pos: number,
  span: WikiLinkDocSpan,
): boolean {
  return pos >= span.start && pos <= span.end;
}

/**
 * Whether a click on `.wiki-link-content` should open the target note.
 * Navigate when the caret was outside the link before the pointer interaction
 * (ProseMirror moves selection into the link on mousedown before click).
 */
export function shouldNavigateWikiLinkClick(
  selectionFromBeforeInteraction: number,
  linkSpan: WikiLinkDocSpan,
): boolean {
  return !isPosInsideWikiLinkSpan(selectionFromBeforeInteraction, linkSpan);
}
