import {
  formatPlaygroundMatchesCanonicalSeed,
  isFormatPlaygroundNote,
  resolvePlaygroundSeedLocale,
} from "@/storage/formatPlaygroundNote";
import type { Note } from "@/types/note";
import type { Locale } from "@/types/settings";

const PREVIEW_CHAR_LIMIT = 120;

function normalizePlainExcerpt(plain: string): string {
  return plain.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

/** Compact list excerpt — unmodified playground uses a fixed label; edited body shows plain text. */
export function deriveNoteListPreview(
  note: Pick<Note, "title" | "content" | "contentPlain">,
  playgroundLabel: string,
  locale: Locale,
): string {
  if (isFormatPlaygroundNote(note.title, note.content)) {
    const seedLocale = resolvePlaygroundSeedLocale(note.content, locale);
    if (
      formatPlaygroundMatchesCanonicalSeed(note.title, note.content, seedLocale)
    ) {
      return playgroundLabel;
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
