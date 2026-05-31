import { describe, expect, it } from "vitest";
import {
  isDebouncedAutosaveStillCurrent,
  shouldPersistAutosaveOnEditorEffectCleanup,
} from "./editorAutosaveEffectCleanup";

describe("shouldPersistAutosaveOnEditorEffectCleanup", () => {
  it("allows persist when bound note is still active", () => {
    expect(shouldPersistAutosaveOnEditorEffectCleanup("note-a", "note-a")).toBe(
      true,
    );
  });

  it("blocks persist after setActiveNote switched to another note", () => {
    expect(shouldPersistAutosaveOnEditorEffectCleanup("note-a", "note-b")).toBe(
      false,
    );
  });

  it("blocks persist when active note was cleared", () => {
    expect(shouldPersistAutosaveOnEditorEffectCleanup("note-a", null)).toBe(
      false,
    );
  });

  it("blocks persist when bound note id is missing", () => {
    expect(shouldPersistAutosaveOnEditorEffectCleanup(null, "note-a")).toBe(
      false,
    );
  });
});

describe("isDebouncedAutosaveStillCurrent", () => {
  it("returns true when scheduled note is still active", () => {
    expect(isDebouncedAutosaveStillCurrent("note-a", "note-a")).toBe(true);
  });

  it("returns false when editor switched before debounce fired", () => {
    expect(isDebouncedAutosaveStillCurrent("note-a", "note-b")).toBe(false);
  });
});
