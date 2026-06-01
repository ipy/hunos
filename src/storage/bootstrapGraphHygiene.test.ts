import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "@/types/note";

const list = vi.fn();
const noteDelete = vi.fn();
const noteUpdate = vi.fn();
const deleteBySource = vi.fn();
const repointIncomingTarget = vi.fn();
const dedupeIncomingWikiLinks = vi.fn();
const syncNoteLinks = vi.fn();
const consolidateProjectDocsNotes = vi.fn();

vi.mock("./noteStorage", () => ({
  noteStorage: {
    list: (...args: unknown[]) => list(...args),
    delete: (...args: unknown[]) => noteDelete(...args),
    update: (...args: unknown[]) => noteUpdate(...args),
  },
}));

vi.mock("./linkStorage", () => ({
  linkStorage: {
    deleteBySource: (...args: unknown[]) => deleteBySource(...args),
    repointIncomingTarget: (...args: unknown[]) =>
      repointIncomingTarget(...args),
    dedupeIncomingWikiLinks: (...args: unknown[]) =>
      dedupeIncomingWikiLinks(...args),
  },
}));

vi.mock("@/graph/graphEngine", () => ({
  graphEngine: {
    syncNoteLinks: (...args: unknown[]) => syncNoteLinks(...args),
  },
}));

vi.mock("./welcomeNotes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./welcomeNotes")>();
  return {
    ...actual,
    consolidateProjectDocsNotes: (...args: unknown[]) =>
      consolidateProjectDocsNotes(...args),
  };
});

describe("reconcileBootstrapGraph", () => {
  beforeEach(() => {
    list.mockReset();
    noteDelete.mockReset();
    noteUpdate.mockReset();
    deleteBySource.mockReset();
    repointIncomingTarget.mockReset();
    dedupeIncomingWikiLinks.mockReset();
    syncNoteLinks.mockReset();
    consolidateProjectDocsNotes.mockReset();
    consolidateProjectDocsNotes.mockResolvedValue("docs-zh");
    syncNoteLinks.mockResolvedValue(undefined);
    deleteBySource.mockResolvedValue(undefined);
    noteDelete.mockResolvedValue(undefined);
    noteUpdate.mockResolvedValue(undefined);
  });

  it("removes duplicate canonical playground rows and resyncs seed links", async () => {
    const {
      getBootstrapPlaygroundSeedContent,
    } = await import("./bootstrapTagSeeds");
    const seedContent = getBootstrapPlaygroundSeedContent("zh");
    const notes: Note[] = [
      {
        id: "pg-old",
        title: "格式试炼场",
        content: seedContent,
        contentPlain: "",
        status: "active",
        isPinned: true,
        createdAt: 1,
        modifiedAt: 1,
        trashedAt: null,
        wordCount: 0,
      },
      {
        id: "pg-new",
        title: "格式试炼场",
        content: seedContent,
        contentPlain: "",
        status: "active",
        isPinned: true,
        createdAt: 2,
        modifiedAt: 2,
        trashedAt: null,
        wordCount: 0,
      },
    ];
    list.mockResolvedValue(notes);

    const { reconcileBootstrapGraph } = await import("./bootstrapGraphHygiene");
    await reconcileBootstrapGraph("zh");

    expect(consolidateProjectDocsNotes).toHaveBeenCalledWith("zh");
    expect(deleteBySource).toHaveBeenCalledTimes(1);
    expect(noteDelete).toHaveBeenCalledTimes(1);
    expect(syncNoteLinks).toHaveBeenCalledWith("pg-new", seedContent);
    expect(dedupeIncomingWikiLinks).toHaveBeenCalledWith("docs-zh");
  });
});
