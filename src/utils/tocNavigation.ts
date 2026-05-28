import type { Editor } from '@tiptap/react';

/** Scroll editor to the Nth heading (among headings with non-empty text), matching TOC order. */
export function scrollToTocIndex(editor: Editor, tocIndex: number): boolean {
  let headingIndex = 0;
  let targetPos: number | null = null;

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return;
    const text = node.textContent;
    if (!text) return;
    if (headingIndex === tocIndex) {
      targetPos = pos;
      return false;
    }
    headingIndex++;
  });

  if (targetPos == null) return false;

  editor
    .chain()
    .focus()
    .setTextSelection(targetPos + 1)
    .scrollIntoView()
    .run();

  return true;
}
