import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPlaygroundContent } from "@/storage/formatPlaygroundNote";
import { filterNotesForPlaygroundList } from "@/storage/formatPlaygroundNote";
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
        await dbUpdate(id, updates);
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

const flushEditorAutosave = vi.fn().mockResolvedValue(null);

vi.mock("@/store/editorAutosaveRegistry", () => ({
  flushEditorAutosave: () => flushEditorAutosave(),
}));

vi.mock("@/graph/graphEngine", () => ({
  graphEngine: {
    syncNoteLinks: vi.fn(),
    renameWikiLinkTargets: vi.fn(),
  },
}));

vi.mock("@/storage/formatPlaygroundNote", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/storage/formatPlaygroundNote")>();
  return {
    ...actual,
    restoreFormatPlaygroundContent: vi.fn(),
  };
});

import { noteStorage } from "@/storage/noteStorage";
import { useNoteStore } from "./noteStore";

function makeNote(partial: Partial<Note> & Pick<Note, "id">): Note {
  const now = Date.now();
  return {
    title: "",
    content: "",
    contentPlain: "",
    isPinned: false,
    status: "active",
    trashedAt: null,
    createdAt: now,
    modifiedAt: now,
    wordCount: 0,
    ...partial,
  };
}

describe("note list integrity", () => {
  beforeEach(() => {
    notesById.clear();
    dbUpdate.mockClear();
    flushEditorAutosave.mockClear();
    useNoteStore.setState({ notes: [], isLoading: false, activeNoteId: null });
  });

  it("loadNotes keeps pinned and unpinned notes visible together", async () => {
    const pinned = makeNote({
      id: "pinned-1",
      title: "Pinned note",
      content: '{"type":"doc","content":[]}',
      isPinned: true,
      modifiedAt: 500,
    });
    const unpinned = makeNote({
      id: "note-2",
      title: "Regular note",
      content: '{"type":"doc","content":[]}',
      modifiedAt: 400,
    });

    notesById.set(pinned.id, pinned);
    notesById.set(unpinned.id, unpinned);

    await useNoteStore.getState().loadNotes({ status: "active" });

    const { notes } = useNoteStore.getState();
    expect(notes.map((n) => n.id).sort()).toEqual(["note-2", "pinned-1"]);
    expect(filterNotesForPlaygroundList(notes, "zh").length).toBe(2);
  });

  // Empty-title notes stay in the list while an IDB row exists (UX-UNTitled-01).
  it("keeps untitled note in store after content save and note switch", async () => {
    const pinned = await noteStorage.create({
      title: "Pinned anchor",
      content: '{"type":"doc","content":[]}',
      isPinned: true,
    });
    const untitled = await noteStorage.create();
    useNoteStore.setState({
      notes: [pinned, untitled],
      activeNoteId: untitled.id,
    });

    const content = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "SWITCH2-untitled-marker" }],
        },
      ],
    });

    await useNoteStore.getState().saveNoteContent(untitled.id, content);
    await useNoteStore.getState().setActiveNote(pinned.id);

    const ids = useNoteStore.getState().notes.map((n) => n.id);
    expect(ids).toContain(untitled.id);
    expect(
      useNoteStore.getState().notes.find((n) => n.id === untitled.id)
        ?.contentPlain,
    ).toContain("SWITCH2-untitled-marker");
  });

  it("filterNotesForPlaygroundList does not hide renamed pinned playground notes", () => {
    const zhPlayground = {
      id: "pg-zh",
      title: "格式试炼场",
      content: JSON.stringify(buildPlaygroundContent("zh")),
      isPinned: false,
      modifiedAt: 100,
    };
    const renamedPinned = {
      id: "pg-renamed",
      title: "TitleUnload3",
      content: JSON.stringify(buildPlaygroundContent("zh")),
      isPinned: true,
      modifiedAt: 500,
    };
    const regular = {
      id: "note-a",
      title: "Alpha",
      content: '{"type":"doc","content":[]}',
      isPinned: false,
      modifiedAt: 300,
    };
    const regularB = {
      id: "note-b",
      title: "Beta",
      content: '{"type":"doc","content":[]}',
      isPinned: false,
      modifiedAt: 200,
    };

    const filtered = filterNotesForPlaygroundList(
      [renamedPinned, zhPlayground, regular, regularB],
      "zh",
    );
    expect(filtered.map((n) => n.id).sort()).toEqual([
      "note-a",
      "note-b",
      "pg-renamed",
      "pg-zh",
    ]);
  });
});
