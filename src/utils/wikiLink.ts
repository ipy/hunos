/** Replace wiki-link targets in serialized TipTap JSON (plain `[[title]]` text nodes). */
export function replaceWikiLinkTitleInContent(
  content: string,
  oldTitle: string,
  newTitle: string,
): string {
  if (!content || !oldTitle || oldTitle === newTitle) return content;
  const escaped = oldTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\[\\[${escaped}\\]\\]`, "gi");
  return content.replace(re, `[[${newTitle}]]`);
}

export function findNoteByWikiTitle<
  T extends { id: string; title: string; status: string },
>(notes: T[], title: string): T | undefined {
  const lower = title.toLowerCase();
  return notes.find(
    (n) => n.status === "active" && n.title.toLowerCase() === lower,
  );
}
