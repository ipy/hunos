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
        equals: (status: string) => ({
          toArray: async () =>
            [...notesById.values()].filter((n) => n.status === status),
        }),
      }),
      filter: () => ({
        toArray: async () => [] as Note[],
      }),
      bulkGet: async () => [] as (Note | undefined)[],
    },
    noteTags: {
      where: () => ({
        equals: () => ({
          toArray: async () => [],
        }),
      }),
      toArray: async () => [],
    },
  },
}));

vi.mock("@/storage/linkStorage", () => ({
  linkStorage: {
    deleteBySourceAndType: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/storage/tagStorage", () => ({
  tagStorage: {
    removeAllForNote: vi.fn(),
    getOrCreate: vi.fn(),
    addNoteTag: vi.fn(),
  },
}));

vi.mock("@/store/tagStore", () => ({
  useTagStore: {
    getState: () => ({ loadTags: vi.fn() }),
  },
}));

import { noteStorage } from "@/storage/noteStorage";
import { useNoteStore } from "./noteStore";

describe("useNoteStore.saveNoteContent", () => {
  beforeEach(() => {
    notesById.clear();
    dbUpdate.mockClear();
    useNoteStore.setState({ notes: [], isLoading: false, activeNoteId: null });
  });

  it("persists content, contentPlain, and wordCount in a single db write", async () => {
    const note = await noteStorage.create({ title: "Autosave" });
    dbUpdate.mockClear();

    const content = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "one two three four five six seven eight nine ten",
            },
          ],
        },
      ],
    });

    await useNoteStore.getState().saveNoteContent(note.id, content);

    expect(dbUpdate).toHaveBeenCalledOnce();
    expect(dbUpdate).toHaveBeenCalledWith(note.id, {
      content,
      contentPlain: "one two three four five six seven eight nine ten\n",
      wordCount: 10,
      modifiedAt: expect.any(Number),
    });
  });
});
