import {
  formatPlaygroundMatchesCanonicalSeed,
  getFormatPlaygroundIntroExcerpt,
  readFormatPlaygroundCanonicalRow,
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
  const storedRow = readFormatPlaygroundCanonicalRow(
    note.title,
    note.content,
    locale,
  );
  if (storedRow) {
    if (
      storedRow.isCanonical ||
      formatPlaygroundMatchesCanonicalSeed(
        storedRow.canonicalTitle,
        storedRow.rowContent,
        storedRow.seedLocale,
      )
    ) {
      return getFormatPlaygroundIntroExcerpt(storedRow.seedLocale);
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
