import type { ChainedCommands, Editor } from "@tiptap/react";

function findAncestorListDepth(
  editor: Editor,
  listType: "orderedList" | "bulletList",
): number | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === listType) {
      return depth;
    }
  }
  return null;
}

/**
 * Toggle bullet list without splitting ordered list items into orphan paragraphs.
 */
export function applyBulletListToolbarCommand(
  editor: Editor,
  chain: ChainedCommands,
): ChainedCommands {
  if (editor.isActive("bulletList")) {
    return chain.toggleBulletList();
  }

  const orderedDepth = findAncestorListDepth(editor, "orderedList");
  if (orderedDepth === null) {
    return chain.toggleBulletList();
  }

  const { $from } = editor.state.selection;
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
