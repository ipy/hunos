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

function scrollHeadingIntoEditorPane(editor: Editor, docPos: number): void {
  const view = editor.view;
  if (!view) return;

  const scrollEl = findEditorScrollContainer(view.dom);
  const headingEl = resolveHeadingElement(view, docPos);
  if (!scrollEl || !headingEl) return;

  const scrollRect = scrollEl.getBoundingClientRect();
  const headingRect = headingEl.getBoundingClientRect();
  const followEl = headingEl.nextElementSibling as HTMLElement | null;
  const followBlockBottom = followEl
    ? followEl.getBoundingClientRect().bottom
    : null;

  const delta = editorScrollDeltaForTocReveal({
    scrollViewportTop: scrollRect.top,
    scrollViewportBottom: scrollRect.bottom,
    headingTop: headingRect.top,
    followBlockBottom,
  });

  if (Math.abs(delta) < 1) return;

  scrollEl.scrollTo({
    top: scrollEl.scrollTop + delta,
    behavior: "smooth",
  });
}

/** Scroll editor to the Nth heading (among headings with non-empty text), matching TOC order. */
export function scrollToTocIndex(editor: Editor, tocIndex: number): boolean {
  let headingIndex = 0;
  let targetPos: number | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "heading") return;
    const text = node.textContent;
    if (!text) return;
    if (headingIndex === tocIndex) {
      targetPos = pos;
      return false;
    }
    headingIndex++;
  });

  if (targetPos == null) return false;

  const scrolled = editor
    .chain()
    .focus(undefined, { scrollIntoView: false })
    .setTextSelection(targetPos + 1)
    .run();

  scrollHeadingIntoEditorPane(editor, targetPos + 1);

  return scrolled;
}

/** Bear parity: scroll to a TOC entry without closing the info panel. */
export function handleInfoPanelTocTap(
  editor: Editor | null,
  tocIndex: number,
): boolean {
  if (!editor) return false;
  return scrollToTocIndex(editor, tocIndex);
}
