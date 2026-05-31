import {
  getFormatPlaygroundIntroExcerpt,
  playgroundRowShowsSeedListPreview,
  readFormatPlaygroundCanonicalRow,
} from "@/storage/formatPlaygroundNote";
import type { Note } from "@/types/note";
import type { Locale } from "@/types/settings";

const PREVIEW_CHAR_LIMIT = 120;

const PLAYGROUND_SHORTCUT_MARKERS = [
  "桌面快捷键：",
  "Desktop shortcuts:",
] as const;

function normalizePlainExcerpt(plain: string): string {
  return plain.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

/** Drop the first plain line when it repeats the note title (H1 echo). */
function stripLeadingTitleLine(plain: string, title: string): string {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) return plain;

  const firstNewline = plain.indexOf("\n");
  if (firstNewline < 0) {
    return plain.trim() === trimmedTitle ? "" : plain;
  }

  const firstLine = plain.slice(0, firstNewline).trim();
  if (firstLine === trimmedTitle) {
    return plain.slice(firstNewline + 1);
  }
  return plain;
}

function regularNoteListExcerpt(
  plain: string,
  title: string,
  limit: number,
): string {
  const normalized = normalizePlainExcerpt(stripLeadingTitleLine(plain, title));
  if (normalized.length <= limit) {
    return normalized;
  }
  return normalized.slice(0, limit);
}

/** Playground plain excerpt — skip try-section shortcut footer; prefer intro or post-shortcut edits. */
function playgroundPlainListExcerpt(plain: string, limit: number): string {
  const normalized = normalizePlainExcerpt(plain);
  for (const marker of PLAYGROUND_SHORTCUT_MARKERS) {
    const idx = normalized.indexOf(marker);
    if (idx < 0) continue;

    const before = normalized.slice(0, idx).trim();
    const afterMarker = normalized.slice(idx);
    const suffixMatch = afterMarker.match(
      /(?:搜索全部笔记\.|search all notes\.)\s*(.+)$/i,
    );
    const suffix = suffixMatch?.[1]?.trim();
    const meaningful = suffix ? `${before} ${suffix}`.trim() : before;

    if (meaningful.length <= limit) {
      return meaningful;
    }
    return suffix ? meaningful.slice(-limit) : meaningful.slice(0, limit);
  }

  if (normalized.length <= limit) {
    return normalized;
  }
  return normalized.slice(-limit);
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
    if (playgroundRowShowsSeedListPreview(note.title, note.content, locale)) {
      return getFormatPlaygroundIntroExcerpt(storedRow.seedLocale);
    }
    return playgroundPlainListExcerpt(
      stripLeadingTitleLine(note.contentPlain ?? "", note.title),
      PREVIEW_CHAR_LIMIT,
    );
  }
  return regularNoteListExcerpt(
    note.contentPlain ?? "",
    note.title,
    PREVIEW_CHAR_LIMIT,
  );
}
