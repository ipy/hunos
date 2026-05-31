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

export interface ActivePinnedNotesDuringSearchOptions {
  /** Pinned note currently open in the editor (AC39-search-restore-ghost). */
  activeNoteId?: string | null;
}

/**
 * Pinned strip while search is active: only the active pinned note, never merged
 * into title-first search hits (AC37 vs AC39-search-restore-ghost).
 */
export function activePinnedNotesDuringSearch<
  T extends NoteSearchMatchFields,
>(
  allNotes: T[],
  options: ActivePinnedNotesDuringSearchOptions = {},
): T[] {
  const activeNoteId = options.activeNoteId?.trim();
  if (!activeNoteId) {
    return [];
  }

  const activePinned = allNotes.find(
    (note) => note.id === activeNoteId && note.isPinned,
  );
  return activePinned ? [activePinned] : [];
}
