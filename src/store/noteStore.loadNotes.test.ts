import { beforeEach, describe, expect, it, vi } from "vitest";
import { MIN_BLOCK_IMAGE_HEIGHT } from "@/components/editor/imageResizeUtils";
import type { Note } from "@/types/note";

const dbUpdate = vi.fn();
const notesById = new Map<string, Note>();

function legacyImageContent(): string {
  return JSON.stringify({
    type: "doc",
    content: [
      {
        type: "image",
        attrs: {
          src: "data:image/png;base64,legacy",
          dataBlockImageFloor: true,
        },
      },
    ],
  });
}

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
    },
  },
}));

vi.mock("@/graph/graphEngine", () => ({
  graphEngine: {
    syncNoteLinks: vi.fn(),
    renameWikiLinkTargets: vi.fn(),
  },
}));

vi.mock("@/store/tagStore", () => ({
  useTagStore: {
    getState: () => ({ loadTags: vi.fn() }),
  },
}));

vi.mock("@/storage/formatPlaygroundNote", () => ({
  restoreFormatPlaygroundContent: vi.fn(),
}));

describe("useNoteStore.loadNotes", () => {
  beforeEach(async () => {
    notesById.clear();
    dbUpdate.mockClear();
    vi.resetModules();
  });

  it("hydrates sanitized content without opening the editor", async () => {
    const { noteStorage } = await import("@/storage/noteStorage");
    const legacy = await noteStorage.create({ title: "Legacy" });
    notesById.set(legacy.id, {
      ...legacy,
      content: legacyImageContent(),
    });

    const { useNoteStore } = await import("./noteStore");
    useNoteStore.setState({ notes: [], isLoading: false, activeNoteId: null });

    await useNoteStore.getState().loadNotes({ status: "active" });

    const hydrated = useNoteStore.getState().notes.find((n) => n.id === legacy.id);
    expect(hydrated?.content).not.toContain("dataBlockImageFloor");
    const parsed = JSON.parse(hydrated!.content) as {
      content?: Array<{ attrs?: Record<string, unknown> }>;
    };
    expect(parsed.content?.[0]?.attrs?.height).toBe(MIN_BLOCK_IMAGE_HEIGHT);
    expect(dbUpdate).toHaveBeenCalledOnce();
    expect(notesById.get(legacy.id)?.content).toBe(hydrated!.content);
  });
});
