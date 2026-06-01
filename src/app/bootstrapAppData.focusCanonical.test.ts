import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPlaygroundContent } from "@/storage/formatPlaygroundNote";
import type { Note } from "@/types/note";

const createWelcomeNotesIfNeeded = vi.fn().mockResolvedValue(undefined);
const reconcileBootstrapGraph = vi.fn().mockResolvedValue(undefined);
const reconcileBootstrapTags = vi.fn().mockResolvedValue(undefined);
const flushEditorAutosave = vi.fn().mockResolvedValue(null);
const clearStashedEditorAutosave = vi.fn();
const loadTags = vi.fn();
const purgeTrash = vi.fn().mockResolvedValue(undefined);
const noteStorageList = vi.fn();
const noteStorageUpdate = vi.fn().mockResolvedValue(undefined);
const noteStorageGet = vi.fn();

function duplicatePlaygroundPair(): Note[] {
  const now = Date.now();
  return [
    {
      id: "pg-en",
      title: "Format Playground",
      content: JSON.stringify(buildPlaygroundContent("en")),
      contentPlain: "",
      isPinned: false,
      status: "active",
      createdAt: now - 200,
      modifiedAt: now - 200,
    },
    {
      id: "pg-zh",
      title: "格式试炼场",
      content: JSON.stringify(buildPlaygroundContent("zh")),
      contentPlain: "",
      isPinned: false,
      status: "active",
      createdAt: now - 100,
      modifiedAt: now - 100,
    },
  ];
}

vi.mock("@/storage/bootstrapGraphHygiene", () => ({
  reconcileBootstrapGraph: (...args: unknown[]) =>
    reconcileBootstrapGraph(...args),
}));

vi.mock("@/storage/bootstrapTagReconcile", () => ({
  reconcileBootstrapTags: (...args: unknown[]) =>
    reconcileBootstrapTags(...args),
}));

vi.mock("@/storage/welcomeNotes", () => ({
  createWelcomeNotesIfNeeded: (...args: unknown[]) =>
    createWelcomeNotesIfNeeded(...args),
}));

vi.mock("@/store/editorAutosaveRegistry", () => ({
  flushEditorAutosave: () => flushEditorAutosave(),
  clearStashedEditorAutosave: () => clearStashedEditorAutosave(),
}));

vi.mock("@/store/tagStore", () => ({
  useTagStore: {
    getState: () => ({ loadTags }),
  },
}));

vi.mock("@/graph/graphEngine", () => ({
  graphEngine: {
    syncNoteLinks: vi.fn().mockResolvedValue(undefined),
    renameWikiLinkTargets: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/storage/noteStorage", () => ({
  noteStorage: {
    list: (...args: unknown[]) => noteStorageList(...args),
    get: (...args: unknown[]) => noteStorageGet(...args),
    update: (...args: unknown[]) => noteStorageUpdate(...args),
    purgeTrash: (...args: unknown[]) => purgeTrash(...args),
  },
}));

describe("bootstrapAppData focusCanonical", () => {
  beforeEach(async () => {
    createWelcomeNotesIfNeeded.mockClear();
    reconcileBootstrapGraph.mockClear();
    reconcileBootstrapTags.mockClear();
    flushEditorAutosave.mockClear();
    clearStashedEditorAutosave.mockClear();
    loadTags.mockClear();
    purgeTrash.mockClear();
    noteStorageList.mockClear();
    noteStorageUpdate.mockClear();
    noteStorageGet.mockClear();
    noteStorageList.mockResolvedValue(duplicatePlaygroundPair());

    const { useNoteStore } = await import("@/store/noteStore");
    useNoteStore.setState({
      notes: [],
      activeNoteId: "pg-en",
      isLoading: false,
    });
  });

  it("retargets editor to locale-canonical playground after loadNotes", async () => {
    const { bootstrapAppData } = await import("./bootstrapAppData");
    const { useNoteStore } = await import("@/store/noteStore");

    await bootstrapAppData("zh");

    expect(useNoteStore.getState().notes).toHaveLength(2);
    expect(useNoteStore.getState().activeNoteId).toBe("pg-zh");
  });

  it("does not retarget when active note is already locale-canonical", async () => {
    const { bootstrapAppData } = await import("./bootstrapAppData");
    const { useNoteStore } = await import("@/store/noteStore");
    useNoteStore.setState({ activeNoteId: "pg-zh" });

    await bootstrapAppData("zh");

    expect(useNoteStore.getState().activeNoteId).toBe("pg-zh");
  });
});
