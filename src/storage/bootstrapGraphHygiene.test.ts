import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "@/types/note";

const list = vi.fn();
const noteDelete = vi.fn();
const noteUpdate = vi.fn();
const deleteBySource = vi.fn();
const repointIncomingTarget = vi.fn();
const dedupeIncomingWikiLinks = vi.fn();
const getIncoming = vi.fn();
const linkDelete = vi.fn();
const noteGet = vi.fn();
const syncNoteLinks = vi.fn();
const consolidateProjectDocsNotes = vi.fn();

vi.mock("./noteStorage", () => ({
  noteStorage: {
    list: (...args: unknown[]) => list(...args),
    get: (...args: unknown[]) => noteGet(...args),
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
    getIncoming: (...args: unknown[]) => getIncoming(...args),
    delete: (...args: unknown[]) => linkDelete(...args),
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
    getIncoming.mockReset();
    linkDelete.mockReset();
    noteGet.mockReset();
    syncNoteLinks.mockReset();
    consolidateProjectDocsNotes.mockReset();
    consolidateProjectDocsNotes.mockResolvedValue("docs-zh");
    syncNoteLinks.mockResolvedValue(undefined);
    deleteBySource.mockResolvedValue(undefined);
    noteDelete.mockResolvedValue(undefined);
    noteUpdate.mockResolvedValue(undefined);
    getIncoming.mockResolvedValue([]);
    linkDelete.mockResolvedValue(undefined);
  });

  it("removes duplicate canonical playground rows and resyncs seed links", async () => {
    const { getBootstrapPlaygroundSeedContent } =
      await import("./bootstrapTagSeeds");
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
    expect(dedupeIncomingWikiLinks).toHaveBeenCalledTimes(2);
  });

  it("drops ghost incoming links from deleted source notes", async () => {
    const { getBootstrapPlaygroundSeedContent } =
      await import("./bootstrapTagSeeds");
    const { getProjectDocsSeed } = await import("./welcomeNotes");
    const seedContent = getBootstrapPlaygroundSeedContent("zh");
    const projectDocsSeed = getProjectDocsSeed("zh");
    const notes: Note[] = [
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
    noteGet.mockResolvedValue({
      id: "docs-zh",
      title: projectDocsSeed.title,
      content: JSON.stringify(projectDocsSeed.content),
      contentPlain: projectDocsSeed.contentPlain,
      status: "active",
      isPinned: false,
      createdAt: 1,
      modifiedAt: 1,
      trashedAt: null,
      wordCount: 0,
    });
    getIncoming.mockResolvedValue([
      {
        id: "link-playground",
        sourceNoteId: "pg-new",
        targetNoteId: "docs-zh",
        type: "wiki_link",
        context: "ctx-a",
        position: 1,
        createdAt: 1,
      },
      {
        id: "link-ghost",
        sourceNoteId: "pg-old",
        targetNoteId: "docs-zh",
        type: "wiki_link",
        context: "ctx-b",
        position: 2,
        createdAt: 1,
      },
    ]);

    const { reconcileBootstrapGraph } = await import("./bootstrapGraphHygiene");
    await reconcileBootstrapGraph("zh");

    expect(linkDelete).toHaveBeenCalledTimes(2);
    expect(linkDelete).toHaveBeenCalledWith("link-ghost");
  });
});
