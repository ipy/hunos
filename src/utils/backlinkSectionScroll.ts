import type { Editor } from "@tiptap/react";
import { scrollToTocDocPos } from "@/utils/tocNavigation";

/** Resolve a heading document position by exact title, then first segment before " · ". */
export function headingDocPosForBacklinkSection(
  editor: Editor,
  sectionLabel: string,
): number | null {
  const candidates = [
    sectionLabel.trim(),
    sectionLabel.split(" · ")[0]?.trim() ?? "",
  ].filter(
    (value, index, list) => value.length > 0 && list.indexOf(value) === index,
  );

  for (const title of candidates) {
    let found: number | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== "heading") return;
      if (node.textContent.trim() !== title) return;
      found = pos;
      return false;
    });
    if (found != null) return found;
  }

  return null;
}

/** Scroll the editor to the section heading referenced by a backlink prefix. */
export function scrollToBacklinkSection(
  editor: Editor,
  sectionLabel: string,
): boolean {
  const headingPos = headingDocPosForBacklinkSection(editor, sectionLabel);
  if (headingPos == null) return false;
  return scrollToTocDocPos(editor, headingPos);
}
