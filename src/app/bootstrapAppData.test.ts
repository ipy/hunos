import { beforeEach, describe, expect, it, vi } from "vitest";

const createWelcomeNotesIfNeeded = vi.fn().mockResolvedValue(undefined);
const flushEditorAutosave = vi.fn().mockResolvedValue(null);
const clearStashedEditorAutosave = vi.fn();
const syncFormatPlaygroundOnLocaleChange = vi.fn().mockResolvedValue(undefined);
const loadNotes = vi.fn().mockResolvedValue(undefined);
const loadTags = vi.fn();
const purgeTrash = vi.fn().mockResolvedValue(undefined);

vi.mock("@/storage/welcomeNotes", () => ({
  createWelcomeNotesIfNeeded: (...args: unknown[]) =>
    createWelcomeNotesIfNeeded(...args),
}));

vi.mock("@/store/editorAutosaveRegistry", () => ({
  flushEditorAutosave: () => flushEditorAutosave(),
  clearStashedEditorAutosave: () => clearStashedEditorAutosave(),
}));

vi.mock("@/storage/formatPlaygroundNote", () => ({
  syncFormatPlaygroundOnLocaleChange: (...args: unknown[]) =>
    syncFormatPlaygroundOnLocaleChange(...args),
}));

vi.mock("@/store/noteStore", () => ({
  useNoteStore: {
    getState: () => ({ loadNotes }),
  },
}));

vi.mock("@/store/tagStore", () => ({
  useTagStore: {
    getState: () => ({ loadTags }),
  },
}));

vi.mock("@/storage/noteStorage", () => ({
  noteStorage: {
    purgeTrash: (...args: unknown[]) => purgeTrash(...args),
  },
}));

describe("bootstrapAppData", () => {
  beforeEach(() => {
    createWelcomeNotesIfNeeded.mockClear();
    flushEditorAutosave.mockClear();
    clearStashedEditorAutosave.mockClear();
    syncFormatPlaygroundOnLocaleChange.mockClear();
    loadNotes.mockClear();
    loadTags.mockClear();
    purgeTrash.mockClear();
  });

  it("seeds notes, syncs playground, then loads stores before UI", async () => {
    const { bootstrapAppData } = await import("./bootstrapAppData");
    const order: string[] = [];

    createWelcomeNotesIfNeeded.mockImplementation(async () => {
      order.push("seed");
    });
    flushEditorAutosave.mockImplementation(async () => {
      order.push("flush");
      return null;
    });
    syncFormatPlaygroundOnLocaleChange.mockImplementation(async () => {
      order.push("sync");
    });
    clearStashedEditorAutosave.mockImplementation(() => {
      order.push("clearStash");
    });
    loadNotes.mockImplementation(async () => {
      order.push("loadNotes");
    });
    loadTags.mockImplementation(() => {
      order.push("loadTags");
    });

    await bootstrapAppData("zh");

    expect(createWelcomeNotesIfNeeded).toHaveBeenCalledWith("zh");
    expect(flushEditorAutosave).toHaveBeenCalled();
    expect(syncFormatPlaygroundOnLocaleChange).toHaveBeenCalledWith("zh", null);
    expect(loadNotes).toHaveBeenCalledWith({ status: "active" });
    expect(loadTags).toHaveBeenCalled();
    expect(clearStashedEditorAutosave).toHaveBeenCalled();
    expect(order).toEqual([
      "seed",
      "flush",
      "sync",
      "clearStash",
      "loadNotes",
      "loadTags",
    ]);
  });
});
