import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPlaygroundContent } from "@/storage/formatPlaygroundNote";
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
          notesById.set(id, {
            ...existing,
            ...updates,
            modifiedAt: updates.modifiedAt ?? Date.now(),
          });
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

vi.mock("@/graph/graphEngine", () => ({
  graphEngine: {
    syncNoteLinks: vi.fn(),
    renameWikiLinkTargets: vi.fn().mockResolvedValue([]),
  },
}));

import { buildPlaygroundContent, getFormatPlaygroundTitle } from "@/storage/formatPlaygroundNote";
import { noteStorage } from "@/storage/noteStorage";
import {
  recoverPendingUnloadBackup,
  writeUnloadBackupSync,
} from "./lifecycleUnload";
import { useNoteStore } from "./noteStore";

describe("noteStore lifecycle rapid saves", () => {
  beforeEach(() => {
    notesById.clear();
    dbUpdate.mockClear();
    useNoteStore.setState({ notes: [], isLoading: false, activeNoteId: null });
  });

  it("keeps rapid title then body writes without losing either field", async () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    const note = await noteStorage.create({
      title: "格式试炼场",
      content: seed,
      contentPlain: "格式试炼场",
    });
    useNoteStore.setState({ notes: [note], activeNoteId: note.id });

    await useNoteStore.getState().saveNoteTitle(note.id, "TitleRapid4");
    const body = JSON.stringify({
      type: "doc",
      attrs: {
        playgroundContentVersion: 22,
        playgroundContentLocale: "zh",
      },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "PhraseRapid4-unique" }],
        },
      ],
    });
    await useNoteStore.getState().saveNoteContent(note.id, body);

    const stored = notesById.get(note.id);
    expect(stored?.title).toBe("TitleRapid4");
    expect(stored?.content).toContain("PhraseRapid4-unique");
    expect(stored?.content).not.toContain("truncated");
  });

  it("restoreFormatPlayground durably resets polluted IDB content", async () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    const note = await noteStorage.create({
      title: "格式试炼场",
      content: seed,
      contentPlain: "格式试炼场",
    });
    useNoteStore.setState({ notes: [note] });

    const polluted = JSON.stringify({
      type: "doc",
      attrs: {
        playgroundContentVersion: 22,
        playgroundContentLocale: "zh",
      },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "T4-MIXED-persist" }],
        },
      ],
    });
    await useNoteStore.getState().saveNoteContent(note.id, polluted);

    await useNoteStore.getState().restoreFormatPlayground(note.id, "zh");

    const stored = notesById.get(note.id);
    expect(stored?.title).toBe(getFormatPlaygroundTitle("zh"));
    expect(stored?.content).not.toContain("T4-MIXED-persist");
    expect(stored?.contentPlain).toContain("格式试炼场");
    const inMemory = useNoteStore.getState().notes.find((n) => n.id === note.id);
    expect(inMemory?.content).not.toContain("T4-MIXED-persist");
  });

  it("reload recover does not resurrect pollution after restoreFormatPlayground", async () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    const note = await noteStorage.create({
      title: "格式试炼场",
      content: seed,
      contentPlain: "格式试炼场",
    });
    const polluted = JSON.stringify({
      type: "doc",
      attrs: {
        playgroundContentVersion: 22,
        playgroundContentLocale: "zh",
      },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "T4-MIXED-reload" }],
        },
      ],
    });
    await useNoteStore.getState().saveNoteContent(note.id, polluted);
    await useNoteStore.getState().restoreFormatPlayground(note.id, "zh");

    const restored = notesById.get(note.id)!;
    expect(restored.content).not.toContain("T4-MIXED-reload");
    expect(restored.modifiedAt).toBeGreaterThan(0);

    writeUnloadBackupSync({
      noteId: note.id,
      title: "格式试炼场",
      content: polluted,
      savedAt: restored.modifiedAt + 10_000,
    });

    await recoverPendingUnloadBackup("zh");

    const afterRecover = notesById.get(note.id);
    expect(afterRecover?.content).not.toContain("T4-MIXED-reload");
    expect(afterRecover?.title).toBe(getFormatPlaygroundTitle("zh"));
  });
});
