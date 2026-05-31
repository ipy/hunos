import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export function findPlaygroundDocumentH1Pos(
  doc: ProseMirrorNode,
): number | null {
  let found: number | null = null;
  doc.descendants((node, pos) => {
    if (found != null) {
      return false;
    }
    if (node.type.name === "heading" && node.attrs.level === 1) {
      found = pos;
      return false;
    }
    return undefined;
  });
  return found;
}

/** Replace the playground body H1 (used when restoring canonical seed into the editor). */
export function syncPlaygroundDocumentH1WithTitle(
  editor: Editor,
  title: string,
): boolean {
  const trimmed = title.trim();
  const { doc, schema } = editor.state;
  const h1Pos = findPlaygroundDocumentH1Pos(doc);
  if (h1Pos == null) {
    return false;
  }

  const h1Node = doc.nodeAt(h1Pos);
  if (!h1Node) {
    return false;
  }

  if (h1Node.textContent === trimmed) {
    return false;
  }

  const headingType = schema.nodes.heading;
  if (!headingType) {
    return false;
  }

  const nextHeading = headingType.create(
    { level: 1 },
    trimmed ? schema.text(trimmed) : undefined,
  );

  return editor
    .chain()
    .setMeta("addToHistory", false)
    .command(({ tr }) => {
      tr.replaceWith(h1Pos, h1Pos + h1Node.nodeSize, nextHeading);
      return true;
    })
    .run();
}
