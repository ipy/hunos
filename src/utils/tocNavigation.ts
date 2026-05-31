import type { Editor } from "@tiptap/react";
import type { EditorView } from "@tiptap/pm/view";
import { findEditorScrollContainer } from "@/components/editor/wikiLinkPointerUtils";

const TOC_SCROLL_TOP_PADDING_PX = 12;
const TOC_SCROLL_BOTTOM_PADDING_PX = 8;
/** Slop for panel TOC taps when an entry sits on the scroll viewport edge. */
const PANEL_TOC_EDGE_SLOP_PX = 12;
const PANEL_TOC_SCROLL_MARGIN_PX = 8;

/** Visible editor viewport; shrinks when the info panel overlays the bottom. */
export function resolveTocScrollViewportBounds(scrollEl: HTMLElement): {
  top: number;
  bottom: number;
} {
  const scrollRect = scrollEl.getBoundingClientRect();
  let bottom = scrollRect.bottom;
  const infoPanel = scrollEl.ownerDocument?.querySelector(
    '[data-testid="info-panel"]',
  );
  if (
    infoPanel &&
    typeof infoPanel === "object" &&
    "getBoundingClientRect" in infoPanel
  ) {
    const panelRect = (
      infoPanel as { getBoundingClientRect: () => DOMRect }
    ).getBoundingClientRect();
    if (panelRect.top < bottom) {
      bottom = Math.max(scrollRect.top + 1, panelRect.top);
    }
  }
  return { top: scrollRect.top, bottom };
}

/** Viewport delta so a heading sits below the scroll pane top with follow block visible. */
export function editorScrollDeltaForTocReveal(options: {
  scrollViewportTop: number;
  scrollViewportBottom: number;
  headingTop: number;
  followBlockBottom: number | null;
  paddingTop?: number;
  paddingBottom?: number;
}): number {
  const paddingTop = options.paddingTop ?? TOC_SCROLL_TOP_PADDING_PX;
  const paddingBottom = options.paddingBottom ?? TOC_SCROLL_BOTTOM_PADDING_PX;
  const targetTop = options.scrollViewportTop + paddingTop;
  let delta = options.headingTop - targetTop;

  if (options.followBlockBottom != null) {
    const projectedFollowBottom = options.followBlockBottom - delta;
    const maxFollowBottom = options.scrollViewportBottom - paddingBottom;
    if (projectedFollowBottom > maxFollowBottom) {
      delta += projectedFollowBottom - maxFollowBottom;
    }
  }

  const projectedHeadingTop = options.headingTop - delta;
  if (projectedHeadingTop < targetTop) {
    delta = options.headingTop - targetTop;
  }

  return Math.min(delta, options.headingTop - targetTop);
}

function isVerticalScrollport(el: HTMLElement): boolean {
  const { overflowY } = getComputedStyle(el);
  return (
    overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay"
  );
}

function scrollportOverflows(el: HTMLElement): boolean {
  return el.scrollHeight > el.clientHeight + 1;
}

/** Scrollport for the TOC list (list itself, else the panel content pane). */
export function resolvePanelTocScrollContainer(
  listEl: HTMLElement,
  preferredScrollEl?: HTMLElement | null,
): HTMLElement | null {
  if (isVerticalScrollport(listEl) && scrollportOverflows(listEl)) {
    return listEl;
  }
  if (
    preferredScrollEl &&
    preferredScrollEl !== listEl &&
    isVerticalScrollport(preferredScrollEl) &&
    scrollportOverflows(preferredScrollEl)
  ) {
    return preferredScrollEl;
  }
  const pane =
    listEl.closest<HTMLElement>('[data-testid="info-panel-content-scroll"]') ??
    listEl.parentElement;
  if (pane && isVerticalScrollport(pane) && scrollportOverflows(pane)) {
    return pane;
  }
  if (isVerticalScrollport(listEl)) return listEl;
  if (preferredScrollEl && isVerticalScrollport(preferredScrollEl)) {
    return preferredScrollEl;
  }
  return pane ?? listEl;
}

/** Scroll a panel TOC button into the info-panel content viewport. */
export function scrollPanelTocEntryIntoView(entryEl: HTMLElement): void {
  const list = entryEl.closest<HTMLElement>(
    '[data-testid="info-panel-toc-list"]',
  );
  if (!list) return;
  const scrollEl = resolvePanelTocScrollContainer(list);
  if (!scrollEl) return;

  const scrollRect = scrollEl.getBoundingClientRect();
  const entryRect = entryEl.getBoundingClientRect();
  const topBound = scrollRect.top + PANEL_TOC_SCROLL_MARGIN_PX;
  const bottomBound = scrollRect.bottom - PANEL_TOC_SCROLL_MARGIN_PX;

  if (entryRect.top < topBound) {
    scrollEl.scrollTop -= topBound - entryRect.top;
  } else if (entryRect.bottom > bottomBound) {
    scrollEl.scrollTop += entryRect.bottom - bottomBound;
  }
}

function panelTocEntryDistance(clientY: number, rect: DOMRect): number {
  if (clientY < rect.top) return rect.top - clientY;
  if (clientY > rect.bottom) return clientY - rect.bottom;
  return 0;
}

function panelTocEntryWithinSlop(clientY: number, rect: DOMRect): boolean {
  return (
    clientY >= rect.top - PANEL_TOC_EDGE_SLOP_PX &&
    clientY <= rect.bottom + PANEL_TOC_EDGE_SLOP_PX
  );
}

/** Resolve a TOC entry from a pointer Y, including bottom-edge slop. */
export function findPanelTocEntryAtPointerY(
  listEl: HTMLElement,
  clientY: number,
  scrollEl?: HTMLElement | null,
): HTMLElement | null {
  const entries = [
    ...listEl.querySelectorAll<HTMLElement>(
      '[data-testid^="info-panel-toc-entry-"]',
    ),
  ];
  const scroll = resolvePanelTocScrollContainer(listEl, scrollEl);
  const scrollRect = scroll?.getBoundingClientRect();
  const inScrollBottomEdge =
    scrollRect != null &&
    clientY >= scrollRect.bottom - PANEL_TOC_EDGE_SLOP_PX &&
    clientY <= scrollRect.bottom + PANEL_TOC_EDGE_SLOP_PX;

  let best: HTMLElement | null = null;
  let bestDistance = Infinity;
  let bestIndex = -1;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const rect = entry.getBoundingClientRect();
    if (!panelTocEntryWithinSlop(clientY, rect)) continue;

    const distance = panelTocEntryDistance(clientY, rect);
    if (distance > bestDistance) continue;

    if (distance < bestDistance) {
      bestDistance = distance;
      best = entry;
      bestIndex = i;
      continue;
    }

    if (!inScrollBottomEdge || best == null) continue;

    const bestRect = best.getBoundingClientRect();
    const extendsBelowScroll =
      scrollRect != null && rect.bottom > scrollRect.bottom + 1;
    const bestExtendsBelowScroll =
      scrollRect != null && bestRect.bottom > scrollRect.bottom + 1;

    if (
      (extendsBelowScroll && !bestExtendsBelowScroll) ||
      (extendsBelowScroll === bestExtendsBelowScroll &&
        (i > bestIndex || rect.bottom > bestRect.bottom))
    ) {
      best = entry;
      bestIndex = i;
    }
  }

  if (best) return best;

  if (!scrollRect || !inScrollBottomEdge) return null;

  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]!;
    const rect = entry.getBoundingClientRect();
    if (rect.top < scrollRect.bottom + PANEL_TOC_EDGE_SLOP_PX) {
      return entry;
    }
  }

  return null;
}

export function panelTocEntryIndex(entryEl: HTMLElement): number {
  const match = entryEl
    .getAttribute("data-testid")
    ?.match(/info-panel-toc-entry-(\d+)/);
  return match ? Number.parseInt(match[1], 10) : -1;
}

function isDomElement(el: unknown): el is HTMLElement {
  return (
    typeof el === "object" &&
    el !== null &&
    "getBoundingClientRect" in el &&
    "tagName" in el
  );
}

function resolveHeadingElement(
  view: EditorView,
  docPos: number,
): HTMLElement | null {
  const domPos = view.domAtPos(docPos);
  let el: unknown = domPos.node;
  if (
    typeof el === "object" &&
    el !== null &&
    "nodeType" in el &&
    (el as { nodeType: number }).nodeType === 3
  ) {
    el = (el as { parentElement?: unknown }).parentElement ?? null;
  }
  if (!isDomElement(el)) return null;

  let current: HTMLElement | null = el;
  while (current && current !== view.dom) {
    if (/^H[1-6]$/.test(current.tagName)) return current;
    if (current.parentElement === view.dom) return current;
    current = current.parentElement;
  }
  return el;
}

function followBlockBottomAtPos(
  view: EditorView,
  headingDocPos: number,
): number | null {
  const doc = view.state.doc;
  const headingNode = doc.nodeAt(headingDocPos);
  if (!headingNode || headingNode.type.name !== "heading") return null;

  const afterHeading = headingDocPos + headingNode.nodeSize;
  if (afterHeading >= doc.content.size) return null;

  const nextBlock = doc.nodeAt(afterHeading);
  if (!nextBlock?.isBlock) return null;

  try {
    return view.coordsAtPos(afterHeading + nextBlock.nodeSize - 1).bottom;
  } catch {
    return null;
  }
}

/** Scroll the editor pane so a heading (and its follow block) are visible. Returns applied scrollTop. */
function scrollHeadingIntoEditorPane(
  editor: Editor,
  headingDocPos: number,
  contentDocPos: number,
): number | null {
  const view = editor.view;
  if (!view) return null;

  const scrollEl = findEditorScrollContainer(view.dom);
  if (!scrollEl) return null;

  const { top: scrollViewportTop, bottom: scrollViewportBottom } =
    resolveTocScrollViewportBounds(scrollEl);
  const headingEl = resolveHeadingElement(view, contentDocPos);
  const headingTop = headingEl
    ? headingEl.getBoundingClientRect().top
    : view.coordsAtPos(contentDocPos).top;

  const followEl = headingEl?.nextElementSibling as HTMLElement | null;
  const followBlockBottom = followEl
    ? followEl.getBoundingClientRect().bottom
    : followBlockBottomAtPos(view, headingDocPos);

  const delta = editorScrollDeltaForTocReveal({
    scrollViewportTop,
    scrollViewportBottom,
    headingTop,
    followBlockBottom,
  });

  if (Math.abs(delta) < 1) return scrollEl.scrollTop;

  const targetScrollTop = scrollEl.scrollTop + delta;
  scrollEl.scrollTop = targetScrollTop;
  return targetScrollTop;
}

/** Scroll editor to a heading at the given document position. */
export function scrollToTocDocPos(
  editor: Editor,
  headingDocPos: number,
): boolean {
  const contentPos = headingDocPos + 1;

  const scrolled = editor
    .chain()
    .focus(undefined, { scrollIntoView: false })
    .setTextSelection(contentPos)
    .run();

  const applyScroll = (): number | null =>
    scrollHeadingIntoEditorPane(editor, headingDocPos, contentPos);

  const scrollEl = editor.view
    ? findEditorScrollContainer(editor.view.dom)
    : null;

  const targetScrollTop = applyScroll();
  if (scrollEl != null && targetScrollTop != null) {
    scrollEl.scrollTop = targetScrollTop;
    const stabilize = () => {
      const retry = applyScroll();
      if (retry != null && Math.abs(retry - scrollEl.scrollTop) > 1) {
        scrollEl.scrollTop = retry;
      }
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(stabilize);
    }
  }

  return scrolled;
}

/** Scroll editor to the Nth heading (among headings with non-empty text), matching TOC order. */
export function scrollToTocIndex(editor: Editor, tocIndex: number): boolean {
  let headingIndex = 0;
  let targetPos: number | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "heading") return;
    const text = node.textContent.trim();
    if (!text) return;
    if (headingIndex === tocIndex) {
      targetPos = pos;
      return false;
    }
    headingIndex++;
  });

  if (targetPos == null) return false;
  return scrollToTocDocPos(editor, targetPos);
}

/** Bear parity: scroll to a TOC entry without closing the info panel. */
export function handleInfoPanelTocTap(
  editor: Editor | null,
  tocIndex: number,
  headingDocPos?: number,
): boolean {
  if (!editor) return false;
  if (headingDocPos != null) {
    return scrollToTocDocPos(editor, headingDocPos);
  }
  return scrollToTocIndex(editor, tocIndex);
}
