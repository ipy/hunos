import {
  getFormatPlaygroundSeedPlain,
  isFormatPlaygroundNote,
} from "@/storage/formatPlaygroundNote";
import type { Note } from "@/types/note";
import type { Locale } from "@/types/settings";

const PREVIEW_CHAR_LIMIT = 120;

function normalizePlainExcerpt(plain: string): string {
  return plain.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

function playgroundPlainMatchesSeed(
  contentPlain: string,
  locale: Locale,
): boolean {
  const plain = normalizePlainExcerpt(contentPlain);
  if (!plain) return true;
  const seedPlain = normalizePlainExcerpt(getFormatPlaygroundSeedPlain(locale));
  return plain === seedPlain || seedPlain.startsWith(plain);
}

/** Compact list excerpt — unmodified playground uses a fixed label; edited body shows plain text. */
export function deriveNoteListPreview(
  note: Pick<Note, "title" | "content" | "contentPlain">,
  playgroundLabel: string,
  locale: Locale,
): string {
  if (isFormatPlaygroundNote(note.title, note.content)) {
    const plain = normalizePlainExcerpt(note.contentPlain ?? "");
    if (plain && !playgroundPlainMatchesSeed(plain, locale)) {
      return plain.length > PREVIEW_CHAR_LIMIT
        ? plain.slice(-PREVIEW_CHAR_LIMIT)
        : plain;
    }
    return playgroundLabel;
  }
  return (note.contentPlain ?? "")
    .slice(0, PREVIEW_CHAR_LIMIT)
    .replace(/\n/g, " ")
    .trim();
}
