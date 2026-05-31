import type { Editor } from "@tiptap/react";
import type { EditorView } from "@tiptap/pm/view";
import { findEditorScrollContainer } from "@/components/editor/wikiLinkPointerUtils";

const TOC_SCROLL_TOP_PADDING_PX = 12;
const TOC_SCROLL_BOTTOM_PADDING_PX = 8;

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
    const projectedFollowBottom =
      options.followBlockBottom - delta;
    const maxFollowBottom = options.scrollViewportBottom - paddingBottom;
    if (projectedFollowBottom > maxFollowBottom) {
      delta += projectedFollowBottom - maxFollowBottom;
    }
  }

  const projectedHeadingTop = options.headingTop - delta;
  if (projectedHeadingTop < targetTop) {
    delta = options.headingTop - targetTop;
  }

  return delta;
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

  const scrollRect = scrollEl.getBoundingClientRect();
  const headingEl = resolveHeadingElement(view, contentDocPos);
  const headingTop = headingEl
    ? headingEl.getBoundingClientRect().top
    : view.coordsAtPos(contentDocPos).top;

  const followEl = headingEl?.nextElementSibling as HTMLElement | null;
  const followBlockBottom = followEl
    ? followEl.getBoundingClientRect().bottom
    : followBlockBottomAtPos(view, headingDocPos);

  const delta = editorScrollDeltaForTocReveal({
    scrollViewportTop: scrollRect.top,
    scrollViewportBottom: scrollRect.bottom,
    headingTop,
    followBlockBottom,
  });

  if (Math.abs(delta) < 1) return scrollEl.scrollTop;

  scrollEl.scrollTop += delta;
  return scrollEl.scrollTop;
}

/** Scroll editor to a heading at the given document position. */
export function scrollToTocDocPos(editor: Editor, headingDocPos: number): boolean {
  const contentPos = headingDocPos + 1;
  const targetScrollTop = scrollHeadingIntoEditorPane(
    editor,
    headingDocPos,
    contentPos,
  );

  const scrolled = editor
    .chain()
    .focus(undefined, { scrollIntoView: false })
    .setTextSelection(contentPos)
    .run();

  const scrollEl = editor.view
    ? findEditorScrollContainer(editor.view.dom)
    : null;
  if (scrollEl != null && targetScrollTop != null) {
    scrollEl.scrollTop = targetScrollTop;
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
