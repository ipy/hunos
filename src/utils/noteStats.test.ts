import { describe, expect, it } from "vitest";
import {
  deriveNoteStatsFromNote,
  deriveNoteStatsFromPlain,
} from "./noteStats";
import type { Note } from "@/types/note";

function baseNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    title: "Test",
    content: "",
    contentPlain: "",
    isPinned: false,
    status: "active",
    trashedAt: null,
    createdAt: 0,
    modifiedAt: 0,
    wordCount: 0,
    ...overrides,
  };
}

describe("deriveNoteStatsFromPlain", () => {
  it("returns zero words for empty plain text", () => {
    expect(deriveNoteStatsFromPlain("").wordCount).toBe(0);
  });

  it("counts words from plain text", () => {
    expect(deriveNoteStatsFromPlain("one two three").wordCount).toBe(3);
  });
});

describe("deriveNoteStatsFromNote", () => {
  it("shows stored zero word count without recomputing from plain", () => {
    const stats = deriveNoteStatsFromNote(
      baseNote({ wordCount: 0, contentPlain: "   \n" }),
    );
    expect(stats.wordCount).toBe(0);
  });

  it("derives word count when wordCount is omitted", () => {
    const note = baseNote({ contentPlain: "one two" });
    delete (note as { wordCount?: number }).wordCount;
    expect(deriveNoteStatsFromNote(note).wordCount).toBe(2);
  });
});
