import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export interface FindMatch {
  from: number;
  to: number;
}

export function findMatchesInDoc(
  doc: ProseMirrorNode,
  query: string,
): FindMatch[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const normalizedQuery = trimmed.toLowerCase();
  const matches: FindMatch[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;

    const lower = node.text.toLowerCase();
    let index = 0;
    while (index <= lower.length - normalizedQuery.length) {
      const found = lower.indexOf(normalizedQuery, index);
      if (found === -1) break;
      matches.push({
        from: pos + found,
        to: pos + found + trimmed.length,
      });
      index = found + normalizedQuery.length;
    }
  });

  return matches;
}

export function wrapFindIndex(
  index: number,
  total: number,
  direction: "next" | "prev",
): number {
  if (total <= 0) return -1;
  if (direction === "next") {
    return index >= total - 1 ? 0 : index + 1;
  }
  return index <= 0 ? total - 1 : index - 1;
}

export function clampFindIndex(index: number, total: number): number {
  if (total <= 0) return -1;
  if (index < 0) return 0;
  if (index >= total) return total - 1;
  return index;
}
