export interface NoteSearchMatchFields {
  id?: string;
  title: string;
  contentPlain?: string | null;
  isPinned?: boolean;
}

/** Body search text with wiki-link targets removed (AC37-search-title-first). */
export function noteSearchBodyPlain(contentPlain: string): string {
  return contentPlain.replace(/\[\[[^\]]+\]\]/g, " ");
}

export function noteSearchMatchFlags(
  note: NoteSearchMatchFields,
  query: string,
): { titleMatch: boolean; bodyMatch: boolean } {
  const lower = query.trim().toLowerCase();
  if (!lower) {
    return { titleMatch: false, bodyMatch: false };
  }
  const titleMatch = note.title.toLowerCase().includes(lower);
  const bodyMatch = noteSearchBodyPlain(note.contentPlain ?? "")
    .toLowerCase()
    .includes(lower);
  return { titleMatch, bodyMatch };
}

/**
 * Title-first search: when any active note title matches, body-only hits are omitted
 * (e.g. wiki-link mentions in 格式试炼场 must not outrank 欢迎使用 Hunos).
 */
export function filterNotesByTitleFirstSearch<T extends NoteSearchMatchFields>(
  notes: T[],
  query: string,
): T[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const matched = notes
    .map((note) => ({
      note,
      ...noteSearchMatchFlags(note, trimmed),
    }))
    .filter(({ titleMatch, bodyMatch }) => titleMatch || bodyMatch);

  const preferTitleOnly = matched.some(({ titleMatch }) => titleMatch);
  const filtered = preferTitleOnly
    ? matched.filter(({ titleMatch }) => titleMatch)
    : matched;

  return filtered.map(({ note }) => note);
}

/** Keep pinned notes visible while a search filter is active (AC39-search-restore-ghost). */
export function mergePinnedNotesForSearchDisplay<
  T extends NoteSearchMatchFields,
>(searchResults: T[], allNotes: T[]): T[] {
  if (searchResults.length === 0) {
    return searchResults;
  }

  const merged = [...searchResults];
  const seen = new Set(
    searchResults.map((note) => note.id).filter(Boolean) as string[],
  );

  for (const note of allNotes) {
    if (!note.isPinned || !note.id || seen.has(note.id)) {
      continue;
    }
    merged.unshift(note);
    seen.add(note.id);
  }

  return merged;
}
