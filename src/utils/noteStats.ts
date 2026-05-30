import {
  extractFromPlainText,
  extractPlainTextFromTiptap,
} from "@/graph/linkExtractor";
import type { Note } from "@/types/note";
import type { Editor } from "@tiptap/react";

export interface NoteStats {
  charCount: number;
  wordCount: number;
  paragraphCount: number;
  readingTimeMinutes: number;
}

export function deriveNoteStatsFromPlain(plain: string): NoteStats {
  const charCount = plain.length;
  const wordCount = extractFromPlainText(plain).wordCount;
  const paragraphCount = plain.split(/\n\s*\n/).filter(Boolean).length || 1;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  return { charCount, wordCount, paragraphCount, readingTimeMinutes };
}

export function deriveNoteStatsFromEditor(editor: Editor): NoteStats {
  return deriveNoteStatsFromPlain(extractPlainTextFromTiptap(editor.getJSON()));
}

export function deriveNoteStatsFromNote(note: Note): NoteStats {
  const plain = note.contentPlain ?? "";
  const charCount = plain.length;
  const wordCount =
    note.wordCount != null
      ? note.wordCount
      : extractFromPlainText(plain).wordCount;
  const paragraphCount = plain.split(/\n\s*\n/).filter(Boolean).length || 1;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  return { charCount, wordCount, paragraphCount, readingTimeMinutes };
}

export function deriveNoteStats(note: Note, editor: Editor | null): NoteStats {
  if (editor) {
    return deriveNoteStatsFromEditor(editor);
  }
  return deriveNoteStatsFromNote(note);
}
