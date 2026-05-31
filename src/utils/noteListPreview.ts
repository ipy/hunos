import {
  getFormatPlaygroundIntroExcerpt,
  playgroundRowShowsSeedListPreview,
  readFormatPlaygroundCanonicalRow,
} from "@/storage/formatPlaygroundNote";
import { WELCOME_NOTE_TITLES } from "@/storage/welcomeNotes";
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

function readFirstHeadingText(content: string): string | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as {
      content?: Array<{
        type?: string;
        content?: Array<{ text?: string }>;
      }>;
    };
    const first = parsed.content?.[0];
    if (first?.type !== "heading") return null;
    const text = (first.content ?? [])
      .map((child) => child.text ?? "")
      .join("")
      .trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

function uniqueNonEmptyLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

/** Drop leading plain lines/prefixes that repeat metadata title or body H1. */
function stripLeadingTitleLine(
  plain: string,
  title: string,
  extraLines: string[] = [],
): string {
  let result = plain;
  for (const line of uniqueNonEmptyLines([title, ...extraLines])) {
    result = stripOneLeadingLineOrPrefix(result, line);
  }
  return result;
}

function stripOneLeadingLineOrPrefix(plain: string, line: string): string {
  const trimmedLine = line.trim();
  if (!trimmedLine) return plain;

  const firstNewline = plain.indexOf("\n");
  if (firstNewline >= 0) {
    const firstLine = plain.slice(0, firstNewline).trim();
    if (firstLine === trimmedLine) {
      return plain.slice(firstNewline + 1);
    }
  } else if (plain.trim() === trimmedLine) {
    return "";
  }

  const trimmedPlain = plain.trimStart();
  if (trimmedPlain.startsWith(trimmedLine)) {
    const remainder = trimmedPlain.slice(trimmedLine.length);
    if (!remainder) return "";
    return remainder.trimStart();
  }

  return plain;
}

function listPreviewLinesToStrip(
  note: Pick<Note, "title" | "content">,
  storedRow: ReturnType<typeof readFormatPlaygroundCanonicalRow>,
): string[] {
  const bodyHeading = readFirstHeadingText(note.content);
  const lines = [bodyHeading ?? ""];
  if (storedRow) {
    lines.push(storedRow.canonicalTitle);
  }
  if (
    WELCOME_NOTE_TITLES.includes(
      note.title as (typeof WELCOME_NOTE_TITLES)[number],
    )
  ) {
    lines.push(note.title);
  }
  return lines;
}

function regularNoteListExcerpt(
  plain: string,
  title: string,
  extraLines: string[],
  limit: number,
): string {
  const normalized = normalizePlainExcerpt(
    stripLeadingTitleLine(plain, title, extraLines),
  );
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

/** Prefix list excerpt with a middle dot so title and preview scan as distinct fields. */
export function formatNoteListPreviewDisplay(excerpt: string): string {
  const trimmed = excerpt.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("·")) return trimmed;
  return `· ${trimmed}`;
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
  const linesToStrip = listPreviewLinesToStrip(note, storedRow);
  if (storedRow) {
    if (playgroundRowShowsSeedListPreview(note.title, note.content, locale)) {
      return getFormatPlaygroundIntroExcerpt(storedRow.seedLocale);
    }
    return playgroundPlainListExcerpt(
      stripLeadingTitleLine(note.contentPlain ?? "", note.title, linesToStrip),
      PREVIEW_CHAR_LIMIT,
    );
  }
  return regularNoteListExcerpt(
    note.contentPlain ?? "",
    note.title,
    linesToStrip,
    PREVIEW_CHAR_LIMIT,
  );
}
