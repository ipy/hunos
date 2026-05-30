import { isFormatPlaygroundNote } from "@/storage/formatPlaygroundNote";
import type { Note } from "@/types/note";

const PREVIEW_CHAR_LIMIT = 120;

/** Compact list excerpt — playground rows use a fixed label instead of full body text. */
export function deriveNoteListPreview(
  note: Pick<Note, "title" | "content" | "contentPlain">,
  playgroundLabel: string,
): string {
  if (isFormatPlaygroundNote(note.title, note.content)) {
    return playgroundLabel;
  }
  return (note.contentPlain ?? "")
    .slice(0, PREVIEW_CHAR_LIMIT)
    .replace(/\n/g, " ")
    .trim();
}
