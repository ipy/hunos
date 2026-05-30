import { describe, expect, it } from "vitest";
import {
  flushEditorAutosave,
  peekStashedEditorAutosave,
  registerEditorAutosaveFlush,
  stashEditorAutosaveSnapshot,
  takeStashedEditorAutosave,
  unregisterEditorAutosaveFlush,
} from "./editorAutosaveRegistry";

describe("editorAutosaveRegistry", () => {
  it("returns null when no editor flush handler is registered", async () => {
    expect(await flushEditorAutosave()).toBeNull();
  });

  it("delegates flush to the registered handler", async () => {
    const handler = async () => '{"type":"doc"}';
    registerEditorAutosaveFlush(handler);
    expect(await flushEditorAutosave()).toBe('{"type":"doc"}');
    unregisterEditorAutosaveFlush(handler);
    expect(await flushEditorAutosave()).toBeNull();
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
});
