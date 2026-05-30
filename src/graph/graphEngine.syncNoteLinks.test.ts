import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "@/types/note";

const dbUpdate = vi.fn();
const notesById = new Map<string, Note>();

vi.mock("@/storage/database", () => ({
  db: {
    notes: {
      add: async (note: Note) => {
        notesById.set(note.id, { ...note });
      },
      get: async (id: string) => notesById.get(id),
      update: async (id: string, updates: Partial<Note>) => {
        dbUpdate(id, updates);
        const existing = notesById.get(id);
        if (existing) {
          notesById.set(id, { ...existing, ...updates });
        }
      },
      where: () => ({
        equals: () => ({
          toArray: async () => [...notesById.values()],
        }),
      }),
      filter: () => ({
        toArray: async () => [] as Note[],
      }),
    },
  },
}));

const deleteBySourceAndType = vi.fn();
const linkCreate = vi.fn();

vi.mock("@/storage/linkStorage", () => ({
  linkStorage: {
    deleteBySourceAndType: (...args: unknown[]) =>
      deleteBySourceAndType(...args),
    create: (...args: unknown[]) => linkCreate(...args),
  },
}));

const removeAllForNote = vi.fn();
const getOrCreate = vi.fn();
const addNoteTag = vi.fn();

vi.mock("@/storage/tagStorage", () => ({
  tagStorage: {
    removeAllForNote: (...args: unknown[]) => removeAllForNote(...args),
    getOrCreate: (...args: unknown[]) => getOrCreate(...args),
    addNoteTag: (...args: unknown[]) => addNoteTag(...args),
  },
}));

import { graphEngine } from "./graphEngine";

describe("graphEngine.syncNoteLinks", () => {
  beforeEach(() => {
    notesById.clear();
    dbUpdate.mockClear();
    deleteBySourceAndType.mockClear();
    linkCreate.mockClear();
    removeAllForNote.mockClear();
    getOrCreate.mockClear();
    addNoteTag.mockClear();
    getOrCreate.mockResolvedValue({ id: "tag-1", name: "demo" });
  });

  it("does not rewrite contentPlain or wordCount on the note", async () => {
    const content = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello #demo and [[Target]]" }],
        },
      ],
    });
    notesById.set("note-1", {
      id: "note-1",
      title: "Test",
      content,
      contentPlain: "stale plain",
      wordCount: 1,
      isPinned: false,
      status: "active",
      trashedAt: null,
      createdAt: 1,
      modifiedAt: 1,
    });

    await graphEngine.syncNoteLinks("note-1", content);

    expect(deleteBySourceAndType).toHaveBeenCalled();
    expect(removeAllForNote).toHaveBeenCalledWith("note-1");
    expect(dbUpdate).not.toHaveBeenCalled();
    expect(notesById.get("note-1")?.contentPlain).toBe("stale plain");
    expect(notesById.get("note-1")?.wordCount).toBe(1);
  });
});
