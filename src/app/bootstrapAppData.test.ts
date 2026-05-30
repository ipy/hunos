import { beforeEach, describe, expect, it, vi } from "vitest";

const createWelcomeNotesIfNeeded = vi.fn().mockResolvedValue(undefined);
const flushEditorAutosave = vi.fn().mockResolvedValue(null);
const clearStashedEditorAutosave = vi.fn();
const syncFormatPlaygroundOnLocaleChange = vi.fn().mockResolvedValue(undefined);
const reconcileBootstrapTags = vi.fn().mockResolvedValue(undefined);
const loadNotes = vi.fn().mockResolvedValue(undefined);
const loadTags = vi.fn();
const purgeTrash = vi.fn().mockResolvedValue(undefined);

vi.mock("@/storage/welcomeNotes", () => ({
  createWelcomeNotesIfNeeded: (...args: unknown[]) =>
    createWelcomeNotesIfNeeded(...args),
}));

const recoverPendingUnloadBackup = vi.fn().mockResolvedValue(undefined);

vi.mock("@/store/lifecycleUnload", () => ({
  recoverPendingUnloadBackup: (...args: unknown[]) =>
    recoverPendingUnloadBackup(...args),
}));

vi.mock("@/store/editorAutosaveRegistry", () => ({
  flushEditorAutosave: () => flushEditorAutosave(),
  clearStashedEditorAutosave: () => clearStashedEditorAutosave(),
}));

vi.mock("@/storage/formatPlaygroundNote", () => ({
  syncFormatPlaygroundOnLocaleChange: (...args: unknown[]) =>
    syncFormatPlaygroundOnLocaleChange(...args),
}));

vi.mock("@/storage/bootstrapTagReconcile", () => ({
  reconcileBootstrapTags: (...args: unknown[]) => reconcileBootstrapTags(...args),
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
    recoverPendingUnloadBackup.mockClear();
    syncFormatPlaygroundOnLocaleChange.mockClear();
    reconcileBootstrapTags.mockClear();
    loadNotes.mockClear();
    loadTags.mockClear();
    purgeTrash.mockClear();
  });

  it("seeds notes, loads stores, syncs playground, then loads tags before UI", async () => {
    const { bootstrapAppData } = await import("./bootstrapAppData");
    const order: string[] = [];

    createWelcomeNotesIfNeeded.mockImplementation(async () => {
      order.push("seed");
    });
    loadNotes.mockImplementation(async () => {
      order.push("loadNotes");
    });
    recoverPendingUnloadBackup.mockImplementation(async () => {
      order.push("recoverBackup");
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
    reconcileBootstrapTags.mockImplementation(async () => {
      order.push("reconcileTags");
    });
    loadTags.mockImplementation(async () => {
      order.push("loadTags");
    });

    await bootstrapAppData("zh");

    expect(createWelcomeNotesIfNeeded).toHaveBeenCalledWith("zh");
    expect(flushEditorAutosave).toHaveBeenCalled();
    expect(recoverPendingUnloadBackup).toHaveBeenCalledWith();
    expect(loadNotes).toHaveBeenCalledWith({ status: "active" });
    expect(syncFormatPlaygroundOnLocaleChange).toHaveBeenCalledWith(
      "zh",
      null,
      {
        focusCanonical: true,
      },
    );
    expect(clearStashedEditorAutosave).toHaveBeenCalled();
    expect(reconcileBootstrapTags).toHaveBeenCalledWith("zh");
    expect(loadTags).toHaveBeenCalled();
    expect(order).toEqual([
      "seed",
      "loadNotes",
      "recoverBackup",
      "flush",
      "sync",
      "clearStash",
      "reconcileTags",
      "loadTags",
    ]);
  });
});
