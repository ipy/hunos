import { MIN_BLOCK_IMAGE_HEIGHT } from "@/components/editor/imageResizeUtils";

type JsonNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
};

function sanitizeImageAttrs(
  attrs: Record<string, unknown>,
): { attrs: Record<string, unknown>; changed: boolean } {
  if (!("dataBlockImageFloor" in attrs)) {
    return { attrs, changed: false };
  }

  const { dataBlockImageFloor, ...rest } = attrs;
  const next: Record<string, unknown> = { ...rest };

  if (dataBlockImageFloor === true && next.height == null) {
    next.height = MIN_BLOCK_IMAGE_HEIGHT;
  }

  return { attrs: next, changed: true };
}

function sanitizeNode(node: JsonNode): { node: JsonNode; changed: boolean } {
  let changed = false;
  let next = node;

  if (node.type === "image" && node.attrs) {
    const result = sanitizeImageAttrs(node.attrs);
    if (result.changed) {
      next = { ...node, attrs: result.attrs };
      changed = true;
    }
  }

  if (node.content?.length) {
    const nextContent: JsonNode[] = [];
    let contentChanged = false;
    for (const child of node.content) {
      const result = sanitizeNode(child);
      nextContent.push(result.node);
      if (result.changed) {
        contentChanged = true;
      }
    }
    if (contentChanged) {
      next = { ...next, content: nextContent };
      changed = true;
    }
  }

  return { node: next, changed };
}

/** Walk a TipTap JSON doc and migrate legacy `dataBlockImageFloor` image attrs. */
export function sanitizeBlockImageFloorInDoc(
  doc: JsonNode,
): { doc: JsonNode; changed: boolean } {
  const { node, changed } = sanitizeNode(doc);
  return { doc: node, changed };
}

/** Sanitize stored note JSON; returns the original string when nothing changed. */
export function sanitizeBlockImageNoteContent(content: string): {
  content: string;
  changed: boolean;
} {
  if (!content) {
    return { content, changed: false };
  }

  try {
    const parsed = JSON.parse(content) as JsonNode;
    const { doc, changed } = sanitizeBlockImageFloorInDoc(parsed);
    return changed
      ? { content: JSON.stringify(doc), changed: true }
      : { content, changed: false };
  } catch {
    return { content, changed: false };
  }
}

/** Returns migrated JSON when legacy floor attrs need upgrading, else null. */
export function migrateLegacyBlockImageFloor(content: string): string | null {
  const { content: sanitized, changed } =
    sanitizeBlockImageNoteContent(content);
  return changed ? sanitized : null;
}
