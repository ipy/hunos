import type { Node } from "@tiptap/pm/model";
import { NodeSelection, type EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

/** Minimum display height for block images (matches sketch resize). */
export const MIN_BLOCK_IMAGE_HEIGHT = 80;

export function isResizableBlockImage(node: Node): boolean {
  return node.type.name === "image";
}

/** Document position of the selected block image, if any. */
export function getSelectedBlockImagePos(state: EditorState): number | null {
  const { selection } = state;
  if (
    selection instanceof NodeSelection &&
    isResizableBlockImage(selection.node)
  ) {
    return selection.from;
  }
  return null;
}

export function isImageResizeHandleActive(
  state: EditorState,
  imagePos: number,
): boolean {
  return getSelectedBlockImagePos(state) === imagePos;
}

/** Attributes for a resize handle widget at `imagePos`. */
export function imageResizeHandleAttributes(
  imagePos: number,
  active: boolean,
): Record<string, string> {
  const attrs: Record<string, string> = {
    "data-testid": "image-resize-handle",
    "data-image-resize-pos": String(imagePos),
  };
  if (active) {
    attrs["data-active"] = "true";
  }
  return attrs;
}

/** Build a resize handle widget for a block image at `imagePos`. */
export function createImageResizeHandle(
  imagePos: number,
  active: boolean,
): HTMLDivElement {
  const handle = document.createElement("div");
  handle.className = "sketch-resize-handle";
  for (const [key, value] of Object.entries(
    imageResizeHandleAttributes(imagePos, active),
  )) {
    handle.setAttribute(key, value);
  }
  return handle;
}

/** Sync editor DOM attributes automation can read for image selection. */
export function syncEditorImageSelectionAttributes(view: EditorView): void {
  const pos = getSelectedBlockImagePos(view.state);
  const dom = view.dom;
  if (pos !== null) {
    dom.setAttribute("data-selected-image-pos", String(pos));
    dom.setAttribute("data-selection-type", "image");
  } else {
    dom.removeAttribute("data-selected-image-pos");
    if (dom.getAttribute("data-selection-type") === "image") {
      dom.removeAttribute("data-selection-type");
    }
  }
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

/** Fallback when handleClickOn does not run (e.g. DOM wrapper mismatch). */
export function handleBlockImageClickFromTarget(
  view: EditorView,
  event: Event,
): boolean {
  const target = event.target;
  if (!(target instanceof Element)) return false;

  const img = target.closest("img.editor-image");
  if (!img || !view.dom.contains(img)) return false;

  const nodePos = view.posAtDOM(img, 0);
  const node = view.state.doc.nodeAt(nodePos);
  if (!node || !isResizableBlockImage(node)) return false;

  return handleBlockImageClick(view, node, nodePos);
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
