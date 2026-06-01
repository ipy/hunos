import type { Editor } from "@tiptap/react";
import type { EditorView } from "@tiptap/pm/view";
import { findEditorScrollContainer } from "@/components/editor/wikiLinkPointerUtils";

const TOC_SCROLL_TOP_PADDING_PX = 12;
const TOC_SCROLL_BOTTOM_PADDING_PX = 8;
/** Slop for panel TOC taps when an entry sits on the scroll viewport edge. */
const PANEL_TOC_EDGE_SLOP_PX = 12;
const PANEL_TOC_SCROLL_MARGIN_PX = 8;

let pinPanelTocListScrollTop = false;

/** Reset on next editor TOC scroll when the panel list must stay at scrollTop 0 (AC44). */
export function requestPinPanelTocListScrollTop(): void {
  pinPanelTocListScrollTop = true;
}

function applyPinPanelTocListScrollTop(clear = false): void {
  if (!pinPanelTocListScrollTop) return;
  const list = document.querySelector<HTMLElement>(
    '[data-testid="info-panel-toc-list"]',
  );
  if (!list) return;
  const scrollEl = resolvePanelTocScrollContainer(list);
  if (scrollEl) {
    scrollEl.scrollTop = 0;
    if (typeof scrollEl.scrollTo === "function") {
      scrollEl.scrollTo({ top: 0, left: 0 });
    }
  }
  if (clear) pinPanelTocListScrollTop = false;
}

function schedulePinPanelTocListScrollTop(): void {
  applyPinPanelTocListScrollTop();
  if (typeof queueMicrotask === "function") {
    queueMicrotask(() => applyPinPanelTocListScrollTop());
  }
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      applyPinPanelTocListScrollTop();
      if (typeof queueMicrotask === "function") {
        queueMicrotask(() => applyPinPanelTocListScrollTop(true));
      } else {
        applyPinPanelTocListScrollTop(true);
      }
    });
  } else {
    applyPinPanelTocListScrollTop(true);
  }
}

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

/**
 * Keep the TOC list at scrollTop 0 on first tap when the row sits below the fold
 * (AC44: editor jumps without pre-scrolling the directory list).
 */
export function shouldDeferPanelTocScrollIntoView(
  entryEl: HTMLElement,
  listEl?: HTMLElement | null,
): boolean {
  const list =
    listEl ??
    entryEl.closest<HTMLElement>('[data-testid="info-panel-toc-list"]');
  if (!list) return false;
  const scrollEl = resolvePanelTocScrollContainer(list);
  if (!scrollEl) return false;
  const scrollRect = scrollEl.getBoundingClientRect();
  const entryRect = entryEl.getBoundingClientRect();
  // Below-fold at scrollTop 0 (not current scroll) so Playwright pre-scroll still pins (AC44).
  const entryTopInContent = entryRect.top - scrollRect.top + scrollEl.scrollTop;
  const entryBottomInContent = entryTopInContent + entryRect.height;
  return entryBottomInContent > scrollEl.clientHeight + 1;
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

  if (scrollRect && inScrollBottomEdge) {
    let firstBelowFold: HTMLElement | null = null;
    let firstBelowFoldTop = Infinity;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const rect = entry.getBoundingClientRect();
      if (rect.bottom <= scrollRect.bottom + 1) continue;
      if (rect.top < firstBelowFoldTop) {
        firstBelowFold = entry;
        firstBelowFoldTop = rect.top;
      }
    }
    if (firstBelowFold) return firstBelowFold;
  }

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

  let lipEntry: HTMLElement | null = null;
  let lipTop = -Infinity;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const rect = entry.getBoundingClientRect();
    if (rect.top > scrollRect.bottom + PANEL_TOC_EDGE_SLOP_PX) continue;
    if (rect.top >= lipTop) {
      lipEntry = entry;
      lipTop = rect.top;
    }
  }
  return lipEntry;
}

export function panelTocEntryIndex(entryEl: HTMLElement): number {
  const match = entryEl
    .getAttribute("data-testid")
    ?.match(/info-panel-toc-entry-(\d+)/);
  return match ? Number.parseInt(match[1], 10) : -1;
}

/**
 * Hit-test a clipped TOC row from layout bounds when pointer events miss the
 * button (AC44: agent-browser testid clicks land on html below the panel fold).
 */
export function findPanelTocEntryAtLayoutPoint(
  listEl: HTMLElement,
  clientX: number,
  clientY: number,
): HTMLElement | null {
  const listRect = listEl.getBoundingClientRect();
  if (
    clientX < listRect.left ||
    clientX > listRect.right ||
    clientY < listRect.top
  ) {
    return null;
  }
  const entries = listEl.querySelectorAll<HTMLElement>(
    '[data-testid^="info-panel-toc-entry-"]',
  );
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]!;
    const rect = entry.getBoundingClientRect();
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      return entry;
    }
  }
  return null;
}

/** Resolve a panel TOC row from viewport Y (pointer, touch, or mouse). */
export function panelTocEntryFromPointerY(
  listEl: HTMLElement,
  clientY: number,
  scrollEl?: HTMLElement | null,
): { entry: HTMLElement; index: number } | null {
  const entry = findPanelTocEntryAtPointerY(listEl, clientY, scrollEl);
  if (!entry) return null;
  const index = panelTocEntryIndex(entry);
  if (index < 0) return null;
  return { entry, index };
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

export function nextHeadingDocPosAfter(
  doc: Editor["state"]["doc"],
  headingDocPos: number,
): number | null {
  const headingNode = doc.nodeAt(headingDocPos);
  if (!headingNode || headingNode.type.name !== "heading") return null;

  let found: number | null = null;
  doc.nodesBetween(
    headingDocPos + headingNode.nodeSize,
    doc.content.size,
    (node, pos) => {
      if (node.type.name !== "heading") return;
      found = pos;
      return false;
    },
  );
  return found;
}

export function previousHeadingDocPosBefore(
  doc: Editor["state"]["doc"],
  headingDocPos: number,
): number | null {
  let found: number | null = null;
  doc.descendants((node, pos) => {
    if (node.type.name !== "heading") return;
    if (pos >= headingDocPos) return false;
    found = pos;
  });
  return found;
}

/** Lower-band anchor when the previous section heading would co-occupy the band. */
export function backlinkScrollAnchorTopWithPrevious(options: {
  bandTop: number;
  bandBottom: number;
  headingTop: number;
  previousHeadingTop: number | null;
  headingHeight?: number;
}): number {
  const headingHeight = options.headingHeight ?? 28;
  const defaultTop = options.bandTop;
  if (options.previousHeadingTop == null) return defaultTop;

  const gapAbove = options.headingTop - options.previousHeadingTop;
  if (gapAbove <= 0 || gapAbove >= options.bandBottom - options.bandTop) {
    return defaultTop;
  }

  const maxAnchor = options.bandTop + gapAbove - headingHeight - 1;
  return Math.min(
    options.bandBottom - headingHeight,
    Math.max(options.bandTop, maxAnchor),
  );
}

/** Reference viewport height for AC67/AC69 backlink scroll band sizing (1280×720). */
export const BACKLINK_SCROLL_BAND_REF_VIEWPORT_PX = 720;
export const BACKLINK_SCROLL_BAND_HEIGHT_RATIO = 0.55;

/** Band height capped at the reference viewport so taller orchestrator panes do not widen co-primary range. */
export function backlinkScrollBandHeight(viewportHeight: number): number {
  return Math.min(
    viewportHeight * BACKLINK_SCROLL_BAND_HEIGHT_RATIO,
    BACKLINK_SCROLL_BAND_REF_VIEWPORT_PX * BACKLINK_SCROLL_BAND_HEIGHT_RATIO,
  );
}

/** Viewport Y for a heading top — matches AC67 backlink scroll band checks. */
export function backlinkScrollBandBounds(
  scrollViewportTop: number,
  scrollViewportBottom: number,
): { bandTop: number; bandBottom: number } {
  const bandTop = scrollViewportTop + TOC_SCROLL_TOP_PADDING_PX;
  const viewportHeight = scrollViewportBottom - scrollViewportTop;
  const bandBottom =
    scrollViewportTop + backlinkScrollBandHeight(viewportHeight);
  return { bandTop, bandBottom };
}

/** Merge next- and previous-section isolation when both neighbors exist (AC67/AC69). */
export function resolveBacklinkScrollAnchorTop(options: {
  bandTop: number;
  bandBottom: number;
  headingTop: number;
  nextHeadingTop: number | null;
  previousHeadingTop: number | null;
  headingHeight?: number;
  /** Demote the previous neighbor on downward hops when constraints conflict (AC69). */
  preferPreviousIsolation?: boolean;
}): number {
  const headingHeight = options.headingHeight ?? 28;
  const bandSpan = options.bandBottom - options.bandTop;
  let minAnchor = options.bandTop;
  let maxAnchor = options.bandBottom - headingHeight;

  if (options.nextHeadingTop != null) {
    const gapBelow = options.nextHeadingTop - options.headingTop;
    if (gapBelow > 0 && gapBelow < bandSpan) {
      minAnchor = Math.max(minAnchor, options.bandBottom - gapBelow + 4);
    }
  }

  if (options.previousHeadingTop != null) {
    const gapAbove = options.headingTop - options.previousHeadingTop;
    if (gapAbove > 0 && gapAbove < bandSpan) {
      maxAnchor = Math.min(
        maxAnchor,
        options.bandTop + gapAbove - headingHeight - 1,
      );
    }
  }

  const preferPrevious =
    options.preferPreviousIsolation ??
    (options.previousHeadingTop != null &&
      (options.nextHeadingTop == null ||
        options.headingTop - options.previousHeadingTop <=
          options.nextHeadingTop - options.headingTop));

  if (minAnchor > maxAnchor) {
    return preferPrevious ? maxAnchor : minAnchor;
  }

  return preferPrevious ? maxAnchor : minAnchor;
}

/**
 * When a following section heading would co-anchor in the viewport band, place the
 * target lower in the band so the neighbor sits below bandBottom (AC67).
 */
export function backlinkScrollAnchorTop(options: {
  bandTop: number;
  bandBottom: number;
  headingTop: number;
  nextHeadingTop: number | null;
}): number {
  const defaultTop = options.bandTop;
  if (options.nextHeadingTop == null) return defaultTop;

  const gap = options.nextHeadingTop - options.headingTop;
  if (gap <= 0 || gap >= options.bandBottom - options.bandTop) {
    return defaultTop;
  }

  return Math.max(options.bandTop, options.bandBottom - gap + 4);
}

function headingTopAtDocPos(
  view: EditorView,
  contentDocPos: number,
): number | null {
  try {
    const headingEl = resolveHeadingElement(view, contentDocPos);
    return headingEl
      ? headingEl.getBoundingClientRect().top
      : view.coordsAtPos(contentDocPos).top;
  } catch {
    return null;
  }
}

/** Scroll the editor pane so a heading (and its follow block) are visible. Returns applied scrollTop. */
function scrollHeadingIntoEditorPane(
  editor: Editor,
  headingDocPos: number,
  contentDocPos: number,
  options?: {
    anchorHeadingOnly?: boolean;
    isolateAdjacentSectionHeading?: boolean;
  },
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
  const followBlockBottom = options?.anchorHeadingOnly
    ? null
    : followEl
      ? followEl.getBoundingClientRect().bottom
      : followBlockBottomAtPos(view, headingDocPos);

  const paddingTop = TOC_SCROLL_TOP_PADDING_PX;
  const paddingBottom = TOC_SCROLL_BOTTOM_PADDING_PX;
  const targetTop = scrollViewportTop + paddingTop;

  let delta = editorScrollDeltaForTocReveal({
    scrollViewportTop,
    scrollViewportBottom,
    headingTop,
    followBlockBottom,
    paddingTop,
    paddingBottom,
  });

  if (options?.anchorHeadingOnly && options?.isolateAdjacentSectionHeading) {
    const nextHeadingPos = nextHeadingDocPosAfter(
      view.state.doc,
      headingDocPos,
    );
    const nextHeadingTop =
      nextHeadingPos != null
        ? headingTopAtDocPos(view, nextHeadingPos + 1)
        : null;
    const previousHeadingPos = previousHeadingDocPosBefore(
      view.state.doc,
      headingDocPos,
    );
    const previousHeadingTop =
      previousHeadingPos != null
        ? headingTopAtDocPos(view, previousHeadingPos + 1)
        : null;
    const headingHeight = headingEl?.getBoundingClientRect().height ?? 28;
    const { bandTop, bandBottom } = backlinkScrollBandBounds(
      scrollViewportTop,
      scrollViewportBottom,
    );
    const anchorTop = resolveBacklinkScrollAnchorTop({
      bandTop,
      bandBottom,
      headingTop,
      nextHeadingTop,
      previousHeadingTop,
      headingHeight,
      preferPreviousIsolation: previousHeadingTop != null,
    });
    delta = headingTop - anchorTop;
  }

  // Visibility guard: never leave the heading below the (info-panel-clamped) viewport.
  const projectedHeadingTop = headingTop - delta;
  const maxHeadingTop = scrollViewportBottom - paddingBottom - 1;
  if (projectedHeadingTop > maxHeadingTop) {
    delta = headingTop - targetTop;
  }

  if (Math.abs(delta) < 1) return scrollEl.scrollTop;

  const targetScrollTop = scrollEl.scrollTop + delta;
  scrollEl.scrollTop = targetScrollTop;
  return targetScrollTop;
}

export interface TocScrollOptions {
  /** Anchor heading at pane top only — skip follow-block reveal (backlink hops). */
  anchorHeadingOnly?: boolean;
  /** Keep the next section heading below the AC67 viewport band when anchoring. */
  isolateAdjacentSectionHeading?: boolean;
}

/** Scroll editor to a heading at the given document position. */
export function scrollToTocDocPos(
  editor: Editor,
  headingDocPos: number,
  options?: TocScrollOptions,
): boolean {
  const contentPos = headingDocPos + 1;

  const scrolled = editor
    .chain()
    .focus(undefined, { scrollIntoView: false })
    .setTextSelection(contentPos)
    .run();

  const applyScroll = (): number | null =>
    scrollHeadingIntoEditorPane(editor, headingDocPos, contentPos, options);

  const scrollEl = editor.view
    ? findEditorScrollContainer(editor.view.dom)
    : null;

  const targetScrollTop = applyScroll();
  if (scrollEl != null && targetScrollTop != null) {
    scrollEl.scrollTop = targetScrollTop;
    schedulePinPanelTocListScrollTop();
    const stabilize = () => {
      const retry = applyScroll();
      if (retry != null && Math.abs(retry - scrollEl.scrollTop) > 1) {
        scrollEl.scrollTop = retry;
      }
      schedulePinPanelTocListScrollTop();
    };
    if (options?.anchorHeadingOnly) {
      stabilize();
    } else if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(stabilize);
    }
  } else {
    schedulePinPanelTocListScrollTop();
  }

  return scrolled && targetScrollTop != null;
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
