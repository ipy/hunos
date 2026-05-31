import { describe, expect, it, vi } from "vitest";

const checkpointStorageAfterFlush = vi.fn(async () => undefined);

vi.mock("@/storage/storageCheckpoint", () => ({
  checkpointStorageAfterFlush: () => checkpointStorageAfterFlush(),
}));

import {
  clearStashedEditorAutosave,
  flushEditorAutosave,
  peekStashedEditorAutosave,
  registerEditorAutosaveFlush,
  stashEditorAutosaveSnapshot,
  takeStashedEditorAutosave,
  takeStashedEditorAutosaveForNote,
  unregisterEditorAutosaveFlush,
} from "./editorAutosaveRegistry";

describe("editorAutosaveRegistry", () => {
  it("returns null when no editor flush handler is registered", async () => {
    checkpointStorageAfterFlush.mockClear();
    expect(await flushEditorAutosave()).toBeNull();
    expect(checkpointStorageAfterFlush).toHaveBeenCalledOnce();
  });

  it("delegates flush to the registered handler", async () => {
    checkpointStorageAfterFlush.mockClear();
    const handler = async () => ({
      content: '{"type":"doc"}',
      persisted: true,
    });
    registerEditorAutosaveFlush(handler);
    expect(await flushEditorAutosave()).toBe('{"type":"doc"}');
    expect(checkpointStorageAfterFlush).toHaveBeenCalledOnce();
    unregisterEditorAutosaveFlush(handler);
    expect(await flushEditorAutosave()).toBeNull();
  });

  it("skips checkpoint when flush handler reports save failure", async () => {
    checkpointStorageAfterFlush.mockClear();
    const handler = async () => ({
      content: '{"type":"doc","pending":true}',
      persisted: false,
    });
    registerEditorAutosaveFlush(handler);
    expect(await flushEditorAutosave()).toBe('{"type":"doc","pending":true}');
    expect(checkpointStorageAfterFlush).not.toHaveBeenCalled();
    unregisterEditorAutosaveFlush(handler);
  });

  it("returns stashed snapshot after handler unregisters", async () => {
    stashEditorAutosaveSnapshot("pg-en", '{"type":"doc","pending":true}');
    expect(await flushEditorAutosave()).toBe('{"type":"doc","pending":true}');
    expect(await flushEditorAutosave()).toBeNull();
  });

  it("peek and take stashed snapshots without affecting handler", async () => {
    stashEditorAutosaveSnapshot("note-1", "{}");
    expect(peekStashedEditorAutosave()).toEqual({
      noteId: "note-1",
      content: "{}",
    });
    expect(takeStashedEditorAutosave()).toEqual({
      noteId: "note-1",
      content: "{}",
    });
    expect(peekStashedEditorAutosave()).toBeNull();
  });

  it("clearStashedEditorAutosave drops peek and take results", () => {
    stashEditorAutosaveSnapshot("note-1", "{}");
    clearStashedEditorAutosave();
    expect(peekStashedEditorAutosave()).toBeNull();
    expect(takeStashedEditorAutosave()).toBeNull();
  });

  it("keeps per-note stashes until each note is taken", async () => {
    stashEditorAutosaveSnapshot("note-a", '{"a":true}');
    stashEditorAutosaveSnapshot("note-b", '{"b":true}');
    expect(takeStashedEditorAutosaveForNote("note-a")).toEqual({
      noteId: "note-a",
      content: '{"a":true}',
    });
    expect(takeStashedEditorAutosaveForNote("note-b")).toEqual({
      noteId: "note-b",
      content: '{"b":true}',
    });
    clearStashedEditorAutosave();
  });
});
