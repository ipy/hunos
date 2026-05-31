import { extractPlainTextFromTiptap } from "@/graph/linkExtractor";
import type { Note } from "@/types/note";
import type { Editor } from "@tiptap/react";

export interface TocItem {
  level: number;
  text: string;
  /** Live editor position; used for TOC scroll jumps. */
  docPos?: number;
}

function walkDocNodes(
  nodes: unknown[],
  visit: (node: {
    type?: string;
    attrs?: { level?: number };
    content?: unknown[];
  }) => void,
): void {
  for (const node of nodes) {
    if (!node || typeof node !== "object") continue;
    const n = node as {
      type?: string;
      attrs?: { level?: number };
      content?: unknown[];
    };
    visit(n);
    if (Array.isArray(n.content)) {
      walkDocNodes(n.content, visit);
    }
  }
}

/** Extract TOC entries from a Tiptap JSON document (all headings with non-empty text). */
export function extractTocFromDoc(doc: unknown): TocItem[] {
  if (!doc || typeof doc !== "object") return [];
  const root = doc as { content?: unknown[] };
  if (!Array.isArray(root.content)) return [];

  const items: TocItem[] = [];
  walkDocNodes(root.content, (node) => {
    if (node.type !== "heading") return;
    const text = extractPlainTextFromTiptap(node).trim();
    if (!text) return;
    items.push({ level: node.attrs?.level ?? 1, text });
  });
  return items;
}

export function extractTocFromContent(content: string): TocItem[] {
  try {
    return extractTocFromDoc(JSON.parse(content));
  } catch {
    return [];
  }
}

export function extractTocFromEditor(editor: Editor): TocItem[] {
  const items: TocItem[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "heading") return;
    const text = node.textContent.trim();
    if (!text) return;
    items.push({ level: node.attrs.level ?? 1, text, docPos: pos });
  });
  return items;
}

export function extractTocFromNote(note: Note): TocItem[] {
  return extractTocFromContent(note.content);
}

export function deriveToc(note: Note, editor: Editor | null): TocItem[] {
  if (editor) {
    return extractTocFromEditor(editor);
  }
  return extractTocFromNote(note);
}

export type InfoPanelTab = "stats" | "toc";

/** Heading-rich notes open the info panel on TOC for discoverability. */
export function defaultInfoPanelTab(
  note: Note,
  editor: Editor | null,
): InfoPanelTab {
  return deriveToc(note, editor).length > 0 ? "toc" : "stats";
}
