import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const flushEditorAutosave = vi.fn().mockResolvedValue(null);

vi.mock("@/store/editorAutosaveRegistry", () => ({
  flushEditorAutosave: () => flushEditorAutosave(),
}));

import {
  enqueueActiveNoteSwitch,
  resetActiveNoteSwitchQueueForTests,
} from "./noteStoreActiveNoteSwitch";

describe("pendingSaveFlush note-switch ordering", () => {
  beforeEach(() => {
    flushEditorAutosave.mockClear();
    resetActiveNoteSwitchQueueForTests();
  });

  it("flushes pending autosave before applying the next active note id", async () => {
    let activeNoteId: string | null = "note-a";
    const order: string[] = [];

    flushEditorAutosave.mockImplementation(async () => {
      order.push("flush");
      return null;
    });

    await enqueueActiveNoteSwitch(
      "note-b",
      () => activeNoteId,
      (nextId) => {
        order.push(`apply:${nextId}`);
        activeNoteId = nextId;
      },
    );

    expect(flushEditorAutosave).toHaveBeenCalledOnce();
    expect(order).toEqual(["flush", "apply:note-b"]);
    expect(activeNoteId).toBe("note-b");
  });

  it("skips flush when switching to the same note id", async () => {
    await enqueueActiveNoteSwitch(
      "note-a",
      () => "note-a",
      () => {
        throw new Error("apply should not run");
      },
    );

    expect(flushEditorAutosave).not.toHaveBeenCalled();
  });

  it("serializes rapid note switches using current id at execution time", async () => {
    let activeNoteId: string | null = "note-a";
    const order: string[] = [];
    let flushCount = 0;

    flushEditorAutosave.mockImplementation(async () => {
      const flushIndex = ++flushCount;
      order.push(`flush-start:${flushIndex}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
      order.push(`flush-end:${flushIndex}`);
      return null;
    });

    const first = enqueueActiveNoteSwitch(
      "note-b",
      () => activeNoteId,
      (nextId) => {
        order.push(`apply:${nextId}`);
        activeNoteId = nextId;
      },
    );
    const second = enqueueActiveNoteSwitch(
      "note-c",
      () => activeNoteId,
      (nextId) => {
        order.push(`apply:${nextId}`);
        activeNoteId = nextId;
      },
    );

    await Promise.all([first, second]);

    expect(flushEditorAutosave).toHaveBeenCalledTimes(2);
    expect(order).toEqual([
      "flush-start:1",
      "flush-end:1",
      "apply:note-b",
      "flush-start:2",
      "flush-end:2",
      "apply:note-c",
    ]);
    expect(activeNoteId).toBe("note-c");
  });
});

describe("useNoteStore.setActiveNote pendingSaveFlush", () => {
  beforeEach(async () => {
    flushEditorAutosave.mockClear();
    resetActiveNoteSwitchQueueForTests();
    const { useNoteStore } = await import("./noteStore");
    useNoteStore.setState({
      notes: [],
      isLoading: false,
      activeNoteId: "note-a",
    });
  });

  afterEach(async () => {
    resetActiveNoteSwitchQueueForTests();
  });

  it("calls flushEditorAutosave before updating activeNoteId", async () => {
    const order: string[] = [];

    flushEditorAutosave.mockImplementation(async () => {
      order.push("flush");
      return null;
    });

    const { useNoteStore } = await import("./noteStore");
    await useNoteStore.getState().setActiveNote("note-b");

    expect(flushEditorAutosave).toHaveBeenCalledOnce();
    expect(order).toEqual(["flush"]);
    expect(useNoteStore.getState().activeNoteId).toBe("note-b");
  });
});
