import { getOverlayToolbarAnchorPos } from "@/utils/editorOverlaySelection";
import type { ChainedCommands, Editor } from "@tiptap/react";
import type { ResolvedPos } from "@tiptap/pm/model";

function findAncestorListDepthAt(
  $from: ResolvedPos,
  listType: "orderedList" | "bulletList",
): number | null {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === listType) {
      return depth;
    }
  }
  return null;
}

function resolveToolbarAnchor(editor: Editor): ResolvedPos {
  const anchorPos = getOverlayToolbarAnchorPos(editor);
  const maxPos = editor.state.doc.content.size;
  const safePos = Math.max(0, Math.min(anchorPos, maxPos));
  return editor.state.doc.resolve(safePos);
}

function isListContextAt(
  editor: Editor,
  listType: "orderedList" | "bulletList",
): boolean {
  return (
    findAncestorListDepthAt(resolveToolbarAnchor(editor), listType) !== null
  );
}

/**
 * Toggle bullet list without splitting ordered list items into orphan paragraphs.
 * Resolves list context from the overlay bookmark, not a stale editor selection.
 */
export function applyBulletListToolbarCommand(
  editor: Editor,
  chain: ChainedCommands,
): ChainedCommands {
  const $from = resolveToolbarAnchor(editor);

  if (isListContextAt(editor, "bulletList")) {
    return chain.toggleBulletList();
  }

  const orderedDepth = findAncestorListDepthAt($from, "orderedList");
  if (orderedDepth === null) {
    return chain.toggleBulletList();
  }

  const listPos = $from.before(orderedDepth);
  const listNode = $from.node(orderedDepth);
  const bulletList = editor.state.schema.nodes.bulletList;
  if (!bulletList) {
    return chain.toggleBulletList();
  }

  return chain.command(({ tr }) => {
    tr.setNodeMarkup(listPos, bulletList, listNode.attrs, listNode.marks);
    return true;
  });
}
