import type { Node } from "@tiptap/pm/model";

/** Minimum display height for block images (matches sketch resize). */
export const MIN_BLOCK_IMAGE_HEIGHT = 80;

export function isResizableBlockImage(node: Node): boolean {
  return node.type.name === "image";
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
