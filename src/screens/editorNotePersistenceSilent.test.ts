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

vi.mock("@/store/noteStore", () => ({
  useNoteStore: {
    getState: () => ({ activeNoteId: "note-a" }),
  },
}));

import { persistNoteContent } from "./editorNotePersistence";

describe("persistNoteContent notifyOnError", () => {
  beforeEach(() => {
    showToast.mockClear();
  });

  it("suppresses save-failed toast when notifyOnError is false", async () => {
    const save = vi.fn().mockRejectedValue(new Error("disk full"));

    expect(
      await persistNoteContent(save, "note-1", "{}", undefined, {
        notifyOnError: false,
      }),
    ).toBe(false);
    expect(showToast).not.toHaveBeenCalled();
  });

  it("suppresses save-failed toast when the note is no longer active", async () => {
    const save = vi.fn().mockRejectedValue(new Error("disk full"));

    expect(
      await persistNoteContent(save, "note-b", "{}", undefined, {
        notifyOnError: true,
      }),
    ).toBe(false);
    expect(showToast).not.toHaveBeenCalled();
  });
});
