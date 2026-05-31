import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  enqueueNoteContentSave,
  resetNoteContentSaveQueueForTests,
} from "./noteStoreContentSaveQueue";

describe("enqueueNoteContentSave", () => {
  beforeEach(() => {
    resetNoteContentSaveQueueForTests();
  });

  it("serializes concurrent saves for the same note id", async () => {
    const order: string[] = [];
    let releaseFirst: (() => void) | undefined;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = enqueueNoteContentSave("note-a", async () => {
      order.push("first-start");
      await firstGate;
      order.push("first-end");
      return true;
    });
    const second = enqueueNoteContentSave("note-a", async () => {
      order.push("second");
      return true;
    });

    await vi.waitFor(() => {
      expect(order).toContain("first-start");
    });
    expect(order).not.toContain("second");
    releaseFirst!();
    await Promise.all([first, second]);
    expect(order).toEqual(["first-start", "first-end", "second"]);
  });

  it("does not block saves for different note ids", async () => {
    const order: string[] = [];
    await Promise.all([
      enqueueNoteContentSave("note-a", async () => {
        order.push("a");
        return true;
      }),
      enqueueNoteContentSave("note-b", async () => {
        order.push("b");
        return true;
      }),
    ]);
    expect(order).toEqual(["a", "b"]);
  });
});
