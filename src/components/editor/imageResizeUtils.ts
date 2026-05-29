import type { Node } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

/** Minimum display height for block images (matches sketch resize). */
export const MIN_BLOCK_IMAGE_HEIGHT = 80;

export function isResizableBlockImage(node: Node): boolean {
  return node.type.name === "image";
}

/** Select a block image on click so the resize handle becomes visible. */
export function handleBlockImageClick(
  view: EditorView,
  node: Node,
  nodePos: number,
): boolean {
  if (!isResizableBlockImage(node)) return false;

  const { selection } = view.state;
  if (selection instanceof NodeSelection && selection.from === nodePos) {
    return false;
  }

  view.dispatch(
    view.state.tr.setSelection(NodeSelection.create(view.state.doc, nodePos)),
  );
  return true;
}

export function computeImageResizeHeight(
  startHeight: number,
  startY: number,
  currentY: number,
): number {
  return Math.max(
    MIN_BLOCK_IMAGE_HEIGHT,
    Math.round(startHeight + (currentY - startY)),
  );
}
