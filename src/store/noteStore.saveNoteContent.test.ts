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

import { buildPlaygroundContent } from "@/storage/formatPlaygroundNote";
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

  it("hydrates in-memory notes with contentPlain after saveNoteContent", async () => {
    const note = await noteStorage.create({
      title: "Snippet card",
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Original snippet baseline" }],
          },
        ],
      }),
    });
    useNoteStore.setState({ notes: [note] });

    const content = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "DistinctiveSnippetLine" }],
        },
      ],
    });

    await useNoteStore.getState().saveNoteContent(note.id, content);

    const stored = useNoteStore.getState().notes.find((n) => n.id === note.id);
    expect(stored?.contentPlain).toContain("DistinctiveSnippetLine");
    expect(stored?.wordCount).toBe(1);
    expect(stored?.content).toBe(content);
  });

  it("returns false and skips db write when playground drift regresses canonical seed", async () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    const note = await noteStorage.create({
      title: "格式试炼场",
      content: seed,
      contentPlain: "格式试炼场",
    });
    useNoteStore.setState({ notes: [note] });
    dbUpdate.mockClear();

    const polluted = JSON.stringify({
      type: "doc",
      attrs: {
        playgroundContentVersion: 22,
        playgroundContentLocale: "zh",
      },
      content: (() => {
        const parsed = JSON.parse(seed) as {
          content: Array<{ type: string; content?: Array<{ text?: string }> }>;
        };
        parsed.content.push({
          type: "paragraph",
          content: [{ type: "text", text: "T19-MIXED-lists" }],
        });
        return parsed.content;
      })(),
    });

    const saved = await useNoteStore
      .getState()
      .saveNoteContent(note.id, polluted);

    expect(saved).toBe(false);
    expect(dbUpdate).not.toHaveBeenCalled();
    expect(notesById.get(note.id)?.content).toBe(seed);
  });

  it("returns true for mark-only drift over canonical playground seed", async () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    const note = await noteStorage.create({
      title: "格式试炼场",
      content: seed,
      contentPlain: "格式试炼场",
    });
    useNoteStore.setState({ notes: [note] });
    dbUpdate.mockClear();

    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          content?: Array<{
            content?: Array<{
              type?: string;
              text?: string;
              marks?: unknown[];
            }>;
          }>;
        }>;
      }>;
    };
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const firstItemText =
      parsed.content[listsIndex + 1]?.content?.[0]?.content?.[0]?.content?.[0];
    if (firstItemText) {
      firstItemText.marks = [{ type: "bold" }];
    }

    const saved = await useNoteStore
      .getState()
      .saveNoteContent(note.id, JSON.stringify(parsed));

    expect(saved).toBe(true);
    expect(dbUpdate).toHaveBeenCalledOnce();
  });

  it("returns false when storage update fails", async () => {
    const note = await noteStorage.create({ title: "Fail path" });
    useNoteStore.setState({ notes: [note] });
    dbUpdate.mockRejectedValueOnce(new Error("disk full"));

    const saved = await useNoteStore
      .getState()
      .saveNoteContent(note.id, '{"type":"doc"}');

    expect(saved).toBe(false);
  });
});
