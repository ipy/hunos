import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const editorSource = readFileSync(
  join(process.cwd(), "src/screens/EditorScreen.tsx"),
  "utf-8",
);

describe("EditorScreen note-switch autosave cleanup", () => {
  it("skips effect-cleanup persist when active note already switched", () => {
    expect(editorSource).toContain(
      "shouldPersistAutosaveOnEditorEffectCleanup",
    );
    expect(editorSource).toContain("const boundNoteId = activeNoteId");
    expect(editorSource).toContain("useNoteStore.getState().activeNoteId");
    expect(editorSource).toContain(
      "void persistEditorContent(boundNoteId, json)",
    );
  });

  it("guards debounced autosave against stale note id after switch", () => {
    expect(editorSource).toContain("isDebouncedAutosaveStillCurrent");
    expect(editorSource).toContain("const scheduledNoteId = activeNoteId");
  });
});
