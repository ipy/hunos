import type { Editor } from "@tiptap/react";
import { findEditorScrollContainer } from "@/components/editor/wikiLinkPointerUtils";
import {
  backlinkScrollBandBounds,
  resolveBacklinkScrollAnchorTop,
  resolveTocScrollViewportBounds,
} from "@/utils/tocNavigation";

/** Resolve a heading document position by exact title, then first segment before " · ". */
export function headingDocPosForBacklinkSection(
  editor: Editor,
  sectionLabel: string,
): number | null {
  const candidates = [
    sectionLabel.trim(),
    sectionLabel.split(" · ")[0]?.trim() ?? "",
  ].filter(
    (value, index, list) => value.length > 0 && list.indexOf(value) === index,
  );

  for (const title of candidates) {
    let found: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== "heading") return;
      if (node.textContent.trim() !== title) return;
      found = pos;
      return false;
    });
    if (found != null) return found;
  }

  return null;
}

function resolveHeadingElement(
  editor: Editor,
  contentDocPos: number,
): HTMLElement | null {
  const view = editor.view;
  if (!view) return null;

  const domPos = view.domAtPos(contentDocPos);
  let el: unknown = domPos.node;
  if (
    typeof el === "object" &&
    el !== null &&
    "nodeType" in el &&
    (el as { nodeType: number }).nodeType === 3
  ) {
    el = (el as { parentElement?: unknown }).parentElement ?? null;
  }
  if (!(typeof el === "object" && el !== null && "getBoundingClientRect" in el)) {
    return null;
  }

  let current = el as HTMLElement;
  while (current && current !== view.dom) {
    if (/^H[1-6]$/.test(current.tagName)) return current;
    if (current.parentElement === view.dom) return current;
    current = current.parentElement as HTMLElement;
  }
  return el as HTMLElement;
}

function nextHeadingDocPosAfter(
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

function previousHeadingDocPosBefore(
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

function headingTopAtDocPos(editor: Editor, contentDocPos: number): number | null {
  try {
    const headingEl = resolveHeadingElement(editor, contentDocPos);
    if (headingEl) return headingEl.getBoundingClientRect().top;
    const view = editor.view;
    return view ? view.coordsAtPos(contentDocPos).top : null;
  } catch {
    return null;
  }
}

function headingInScrollBand(
  scrollEl: HTMLElement,
  headingEl: HTMLElement,
): boolean {
  const { top, bottom } = resolveTocScrollViewportBounds(scrollEl);
  const { bandTop, bandBottom } = backlinkScrollBandBounds(top, bottom);
  const rect = headingEl.getBoundingClientRect();
  const center = (rect.top + rect.bottom) / 2;
  if (center >= bandTop && center <= bandBottom) return true;
  return rect.top >= bandTop && rect.top <= bandBottom;
}

/** Scroll the editor to the section heading referenced by a backlink prefix. */
export function scrollToBacklinkSection(
  editor: Editor,
  sectionLabel: string,
): boolean {
  const headingPos = headingDocPosForBacklinkSection(editor, sectionLabel);
  if (headingPos == null) return false;

  const view = editor.view;
  if (!view) return false;

  const scrollEl = findEditorScrollContainer(view.dom);
  const contentDocPos = headingPos + 1;
  const headingEl = resolveHeadingElement(editor, contentDocPos);
  if (!scrollEl || !headingEl) return false;

  const { top: scrollViewportTop, bottom: scrollViewportBottom } =
    resolveTocScrollViewportBounds(scrollEl);
  const { bandTop, bandBottom } = backlinkScrollBandBounds(
    scrollViewportTop,
    scrollViewportBottom,
  );

  const headingTop = headingEl.getBoundingClientRect().top;
  const headingHeight = headingEl.getBoundingClientRect().height || 28;
  const nextHeadingPos = nextHeadingDocPosAfter(view.state.doc, headingPos);
  const nextHeadingTop =
    nextHeadingPos != null
      ? headingTopAtDocPos(editor, nextHeadingPos + 1)
      : null;
  const previousHeadingPos = previousHeadingDocPosBefore(
    view.state.doc,
    headingPos,
  );
  const previousHeadingTop =
    previousHeadingPos != null
      ? headingTopAtDocPos(editor, previousHeadingPos + 1)
      : null;

  const anchorTop = resolveBacklinkScrollAnchorTop({
    bandTop,
    bandBottom,
    headingTop,
    nextHeadingTop,
    previousHeadingTop,
    headingHeight,
  });

  const applyScroll = () => {
    const currentTop = headingEl.getBoundingClientRect().top;
    const delta = currentTop - anchorTop;
    if (Math.abs(delta) >= 1) {
      scrollEl.scrollTop += delta;
    }
  };

  applyScroll();

  editor
    .chain()
    .focus(undefined, { scrollIntoView: false })
    .setTextSelection(contentDocPos)
    .run();

  applyScroll();
  applyScroll();

  if (!headingInScrollBand(scrollEl, headingEl)) return false;

  for (const neighborPos of [previousHeadingPos, nextHeadingPos]) {
    if (neighborPos == null) continue;
    const neighborEl = resolveHeadingElement(editor, neighborPos + 1);
    if (neighborEl && headingInScrollBand(scrollEl, neighborEl)) return false;
  }

  return true;
}

export const BACKLINK_SECTION_SCROLL_MAX_ATTEMPTS = 30;

type FrameScheduler = (callback: FrameRequestCallback) => number;

/** Retry section scroll until the editor document exposes the target heading. */
export function scheduleBacklinkSectionScroll(
  tryScroll: () => boolean,
  onSuccess: () => void,
  frame: FrameScheduler = requestAnimationFrame,
  cancelFrame: (handle: number) => void = cancelAnimationFrame,
  maxAttempts: number = BACKLINK_SECTION_SCROLL_MAX_ATTEMPTS,
  onGiveUp?: () => void,
): () => void {
  if (tryScroll()) {
    onSuccess();
    return () => {};
  }

  let attempts = 0;
  let rafId = 0;
  let cancelled = false;

  const tick: FrameRequestCallback = () => {
    if (cancelled) return;
    if (tryScroll()) {
      onSuccess();
      return;
    }
    if (++attempts >= maxAttempts) {
      onGiveUp?.();
      return;
    }
    rafId = frame(tick);
  };

  rafId = frame(tick);

  return () => {
    cancelled = true;
    cancelFrame(rafId);
  };
}
