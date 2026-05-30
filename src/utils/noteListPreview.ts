import {
  formatPlaygroundMatchesCanonicalSeed,
  getFormatPlaygroundIntroExcerpt,
  isFormatPlaygroundNote,
  playgroundPersistedContentForRow,
  resolvePlaygroundSeedLocale,
} from "@/storage/formatPlaygroundNote";
import type { Note } from "@/types/note";
import type { Locale } from "@/types/settings";

const PREVIEW_CHAR_LIMIT = 120;

function normalizePlainExcerpt(plain: string): string {
  return plain.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

/** List excerpt — canonical playground shows seed intro; edited body shows plain text. */
export function deriveNoteListPreview(
  note: Pick<Note, "title" | "content" | "contentPlain">,
  _playgroundLabel: string,
  locale: Locale,
): string {
  const rowContent = playgroundPersistedContentForRow(note.content);
  if (isFormatPlaygroundNote(note.title, rowContent)) {
    const seedLocale = resolvePlaygroundSeedLocale(rowContent, locale);
    if (formatPlaygroundMatchesCanonicalSeed(note.title, rowContent, seedLocale)) {
      return getFormatPlaygroundIntroExcerpt(seedLocale);
    }
    const plain = normalizePlainExcerpt(note.contentPlain ?? "");
    return plain.length > PREVIEW_CHAR_LIMIT
      ? plain.slice(-PREVIEW_CHAR_LIMIT)
      : plain;
  }
  return (note.contentPlain ?? "")
    .slice(0, PREVIEW_CHAR_LIMIT)
    .replace(/\n/g, " ")
    .trim();
}
