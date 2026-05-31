import type { Editor } from "@tiptap/react";

function scrollHeadingDomIntoView(editor: Editor, docPos: number): void {
  const view = editor.view;
  if (!view) return;

  const domPos = view.domAtPos(docPos);
  const node = domPos.node as {
    scrollIntoView?: (options?: ScrollIntoViewOptions) => void;
    parentElement?: {
      scrollIntoView?: (options?: ScrollIntoViewOptions) => void;
    } | null;
  };
  const target =
    typeof node.scrollIntoView === "function"
      ? node
      : (typeof node.parentElement?.scrollIntoView === "function"
          ? node.parentElement
          : null);
  target?.scrollIntoView?.({ block: "start", behavior: "smooth" });
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
    .focus()
    .setTextSelection(targetPos + 1)
    .scrollIntoView()
    .run();

  scrollHeadingDomIntoView(editor, targetPos + 1);

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
