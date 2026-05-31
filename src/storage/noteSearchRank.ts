export interface NoteSearchMatchFields {
  title: string;
  contentPlain?: string | null;
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
  const bodyMatch = (note.contentPlain ?? "").toLowerCase().includes(lower);
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
