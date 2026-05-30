import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "@/types/note";
import {
  bumpPlaygroundWriteEpoch,
  resetPlaygroundWriteEpochForTests,
} from "./noteStorePlaygroundWriteEpoch";

const dbUpdate = vi.fn();
const notesById = new Map<string, Note>();

vi.mock("@/storage/database", () => ({
  db: {
    notes: {
      get: async (id: string) => notesById.get(id),
      update: async (id: string, updates: Partial<Note>) => {
        await dbUpdate(id, updates);
        const existing = notesById.get(id);
        if (existing) {
          notesById.set(id, {
            ...existing,
            ...updates,
            modifiedAt: updates.modifiedAt ?? Date.now(),
          });
        }
      },
    },
  },
}));

vi.mock("@/graph/graphEngine", () => ({
  graphEngine: {
    renameWikiLinkTargets: vi.fn().mockResolvedValue([]),
  },
}));

describe("saveNoteTitle playground write epoch", () => {
  beforeEach(() => {
    resetPlaygroundWriteEpochForTests();
    dbUpdate.mockReset();
    notesById.clear();
    notesById.set("pg-1", {
      id: "pg-1",
      title: "Format Playground",
      content: "{}",
      contentPlain: "",
      status: "active",
      isPinned: true,
      createdAt: 1,
      modifiedAt: 1,
    });
  });

  it("drops stale title writes after playground restore bumps epoch", async () => {
    const scheduledEpoch = 0;
    bumpPlaygroundWriteEpoch("pg-1");

    const { useNoteStore } = await import("./noteStore");
    const seed = notesById.get("pg-1")!;
    useNoteStore.setState({ notes: [seed], activeNoteId: "pg-1" });
    await useNoteStore
      .getState()
      .saveNoteTitle("pg-1", "T9-MIXED-title", scheduledEpoch);

    expect(dbUpdate).not.toHaveBeenCalled();
    expect(
      useNoteStore.getState().notes.find((n) => n.id === "pg-1")?.title,
    ).toBe("Format Playground");
  });

  it("persists title when write epoch matches", async () => {
    const epoch = bumpPlaygroundWriteEpoch("pg-1");

    const { useNoteStore } = await import("./noteStore");
    const seed = notesById.get("pg-1")!;
    useNoteStore.setState({ notes: [seed], activeNoteId: "pg-1" });
    await useNoteStore
      .getState()
      .saveNoteTitle("pg-1", "Renamed Playground", epoch);

    expect(dbUpdate).toHaveBeenCalledOnce();
    expect(
      useNoteStore.getState().notes.find((n) => n.id === "pg-1")?.title,
    ).toBe("Renamed Playground");
  });
});
