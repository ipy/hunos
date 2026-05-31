const NOTE_HASH_PREFIX = "#note/";

/** Hash fragment for a note id (AC39-wiki-link-nav URL sync). */
export function noteHashForId(noteId: string): string {
  return `${NOTE_HASH_PREFIX}${encodeURIComponent(noteId)}`;
}

export function parseNoteIdFromLocation(
  hash: string = typeof window !== "undefined" ? window.location.hash : "",
): string | null {
  if (!hash.startsWith(NOTE_HASH_PREFIX)) {
    return null;
  }
  const raw = hash.slice(NOTE_HASH_PREFIX.length).split(/[?#]/)[0] ?? "";
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Keep the browser URL in sync with the active note without a full navigation. */
export function syncActiveNoteUrl(noteId: string | null): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const nextHash = noteId ? noteHashForId(noteId) : "";
  if (url.hash === nextHash) return;

  url.hash = nextHash;
  window.history.replaceState(null, "", url.toString());
}
