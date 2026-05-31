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

export interface MergePinnedNotesForSearchOptions {
  /** Pinned note currently open in the editor (AC39-search-restore-ghost). */
  activeNoteId?: string | null;
}

/**
 * Keep the active pinned note visible while a search filter is active
 * (AC39-search-restore-ghost). Does not inject every pinned note — that would
 * break AC37 title-first search (e.g. 格式试炼场 must stay excluded for 欢迎).
 */
export function mergePinnedNotesForSearchDisplay<
  T extends NoteSearchMatchFields,
>(
  searchResults: T[],
  allNotes: T[],
  options: MergePinnedNotesForSearchOptions = {},
): T[] {
  const activeNoteId = options.activeNoteId?.trim();
  if (!activeNoteId) {
    return searchResults;
  }

  if (searchResults.some((note) => note.id === activeNoteId)) {
    return searchResults;
  }

  const activePinned = allNotes.find(
    (note) => note.id === activeNoteId && note.isPinned,
  );
  if (!activePinned) {
    return searchResults;
  }

  return [activePinned, ...searchResults];
}
