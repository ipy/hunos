import type { EditorView } from "@tiptap/pm/view";

const WIKI_LINK_HIT_PAD_PX = 6;

export interface WikiLinkPointerMatch {
  start: number;
  end: number;
  contentStart: number;
  contentEnd: number;
  title: string;
}

/** Nearest ancestor that scrolls editor content (EditorScreen body pane). */
export function findEditorScrollContainer(
  editorDom: HTMLElement,
): HTMLElement | null {
  let el: HTMLElement | null = editorDom.parentElement;
  let overflowCandidate: HTMLElement | null = null;
  while (el) {
    const { overflowY } = getComputedStyle(el);
    if (
      overflowY === "auto" ||
      overflowY === "scroll" ||
      overflowY === "overlay"
    ) {
      if (el.scrollHeight > el.clientHeight + 1) {
        return el;
      }
      overflowCandidate ??= el;
    }
    el = el.parentElement;
  }
  return overflowCandidate;
}

export function isPointerOverEditorColumn(
  view: EditorView,
  clientX: number,
): boolean {
  const rect = view.dom.getBoundingClientRect();
  return (
    clientX >= rect.left - WIKI_LINK_HIT_PAD_PX &&
    clientX <= rect.right + WIKI_LINK_HIT_PAD_PX
  );
}

function pointerContentCoords(
  view: EditorView,
  clientX: number,
  clientY: number,
): {
  contentX: number;
  contentY: number;
  rect: DOMRect;
  scrollTop: number;
  scrollLeft: number;
} {
  const scrollEl = findEditorScrollContainer(view.dom);
  const measureEl = scrollEl ?? view.dom;
  const rect = measureEl.getBoundingClientRect();
  const scrollTop = scrollEl?.scrollTop ?? 0;
  const scrollLeft = scrollEl?.scrollLeft ?? 0;

  return {
    contentX: scrollLeft + (clientX - rect.left),
    contentY: scrollTop + (clientY - rect.top),
    rect,
    scrollTop,
    scrollLeft,
  };
}

/**
 * Resolve a wiki-link from viewport pointer coordinates when decoration DOM is
 * offscreen or has a zero hit target (elementFromPoint returns null).
 */
export function wikiLinkMatchAtPointer(
  view: EditorView,
  event: MouseEvent | PointerEvent,
  links: readonly WikiLinkPointerMatch[],
): WikiLinkPointerMatch | null {
  if (links.length === 0) return null;
  if (!isPointerOverEditorColumn(view, event.clientX)) return null;

  const { contentX, contentY, rect, scrollTop, scrollLeft } =
    pointerContentCoords(view, event.clientX, event.clientY);

  for (const wl of links) {
    const start = view.coordsAtPos(wl.contentStart);
    const end = view.coordsAtPos(wl.contentEnd);
    const linkTop =
      scrollTop +
      (Math.min(start.top, end.top) - rect.top) -
      WIKI_LINK_HIT_PAD_PX;
    const linkBottom =
      scrollTop +
      (Math.max(start.bottom, end.bottom) - rect.top) +
      WIKI_LINK_HIT_PAD_PX;
    const linkLeft =
      scrollLeft +
      (Math.min(start.left, end.left) - rect.left) -
      WIKI_LINK_HIT_PAD_PX;
    const linkRight =
      scrollLeft +
      (Math.max(start.right, end.right) - rect.left) +
      WIKI_LINK_HIT_PAD_PX;

    if (
      contentX >= linkLeft &&
      contentX <= linkRight &&
      contentY >= linkTop &&
      contentY <= linkBottom
    ) {
      return wl;
    }
  }

  return null;
}

/**
 * Map pointer coordinates through the editor scroll container, then resolve a
 * document position for wiki-link activation.
 */
export function wikiLinkMatchAtScrollMappedPointer(
  view: EditorView,
  event: MouseEvent | PointerEvent,
  links: readonly WikiLinkPointerMatch[],
): WikiLinkPointerMatch | null {
  const mapped = wikiLinkMatchAtPointer(view, event, links);
  if (mapped) return mapped;

  const coords = view.posAtCoords({
    left: event.clientX,
    top: event.clientY,
  });
  if (!coords) return null;

  return (
    links.find(
      (wl) => coords.pos >= wl.contentStart && coords.pos <= wl.contentEnd,
    ) ?? null
  );
}
