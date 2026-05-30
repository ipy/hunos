import { beforeEach, describe, expect, it, vi } from "vitest";
import { MIN_BLOCK_IMAGE_HEIGHT } from "@/components/editor/imageResizeUtils";
import type { Note } from "@/types/note";

const dbUpdate = vi.fn();
const storedNotes: Note[] = [];

const LEGACY_SRC = "data:image/png;base64,legacy";

function noteBContent(): string {
  return JSON.stringify({
    type: "doc",
    content: [
      {
        type: "image",
        attrs: { src: LEGACY_SRC, dataBlockImageFloor: true },
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "See [[Old Title]] for details." }],
      },
    ],
  });
}

vi.mock("@/storage/database", () => ({
  db: {
    notes: {
      update: async (id: string, updates: Partial<Note>) => {
        dbUpdate(id, updates);
        const note = storedNotes.find((n) => n.id === id);
        if (note) Object.assign(note, updates);
      },
    },
  },
}));

vi.mock("@/storage/linkStorage", () => ({
  linkStorage: {
    deleteBySourceAndType: vi.fn(),
    create: vi.fn(),
    getIncoming: vi.fn(),
    getOutgoing: vi.fn(),
  },
}));

vi.mock("@/storage/tagStorage", () => ({
  tagStorage: {
    removeAllForNote: vi.fn(),
    getOrCreate: vi.fn(),
    addNoteTag: vi.fn(),
  },
}));

vi.mock("@/storage/noteStorage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/storage/noteStorage")>();
  return {
    noteStorage: {
      ...actual.noteStorage,
      list: vi.fn(async () => [...storedNotes]),
      get: vi.fn(async (id: string) => storedNotes.find((n) => n.id === id)),
      search: vi.fn(async () => []),
    },
  };
});

import { graphEngine } from "./graphEngine";

describe("graphEngine.renameWikiLinkTargets", () => {
  beforeEach(() => {
    dbUpdate.mockClear();
    storedNotes.length = 0;
    storedNotes.push(
      {
        id: "note-a",
        title: "Old Title",
        content: "",
        contentPlain: "",
        isPinned: false,
        status: "active",
        trashedAt: null,
        createdAt: 1,
        modifiedAt: 1,
        wordCount: 0,
      },
      {
        id: "note-b",
        title: "Linked note",
        content: noteBContent(),
        contentPlain: "See [[Old Title]] for details.",
        isPinned: false,
        status: "active",
        trashedAt: null,
        createdAt: 2,
        modifiedAt: 2,
        wordCount: 6,
      },
    );
  });

  it("sanitizes stored JSON when rewriting wikilink targets", async () => {
    const updated = await graphEngine.renameWikiLinkTargets(
      "Old Title",
      "New Title",
    );

    expect(updated).toHaveLength(1);
    expect(updated[0]?.id).toBe("note-b");

    const stored = storedNotes.find((n) => n.id === "note-b");
    expect(stored?.content).toContain("[[New Title]]");
    expect(stored?.content).not.toContain("[[Old Title]]");
    expect(stored?.content).not.toContain("dataBlockImageFloor");

    const parsed = JSON.parse(stored!.content) as {
      content?: Array<{ attrs?: Record<string, unknown> }>;
    };
    expect(parsed.content?.[0]?.attrs?.height).toBe(MIN_BLOCK_IMAGE_HEIGHT);
    expect(parsed.content?.[0]?.attrs).not.toHaveProperty(
      "dataBlockImageFloor",
    );
  });
});
