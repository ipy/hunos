import { beforeEach, describe, expect, it, vi } from "vitest";

const showToast = vi.fn();

vi.mock("@/store/uiStore", () => ({
  useUIStore: {
    getState: () => ({ showToast }),
  },
}));

vi.mock("@/i18n", () => ({
  default: {
    t: (key: string) => key,
  },
}));

import { persistNoteContent, persistNoteTitle } from "./editorNotePersistence";

describe("editorNotePersistence", () => {
  beforeEach(() => {
    showToast.mockClear();
  });

  it("returns true when content save succeeds", async () => {
    const save = vi.fn().mockResolvedValue(undefined);

    expect(await persistNoteContent(save, "note-1", "{}")).toBe(true);
    expect(save).toHaveBeenCalledWith("note-1", "{}", undefined);
    expect(showToast).not.toHaveBeenCalled();
  });

  it("shows toast and returns false when content save fails", async () => {
    const save = vi.fn().mockRejectedValue(new Error("disk full"));

    expect(await persistNoteContent(save, "note-1", '{"pending":true}')).toBe(
      false,
    );
    expect(showToast).toHaveBeenCalledWith("editor.saveFailed", "error");
  });

  it("shows toast and returns false when title save fails", async () => {
    const save = vi.fn().mockRejectedValue(new Error("disk full"));

    expect(await persistNoteTitle(save, "note-1", "Retry Title")).toBe(false);
    expect(showToast).toHaveBeenCalledWith("editor.saveFailed", "error");
  });
});
