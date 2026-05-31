import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const editorSource = readFileSync(
  join(process.cwd(), "src/screens/EditorScreen.tsx"),
  "utf-8",
);

describe("EditorScreen note-switch autosave cleanup", () => {
  it("does not fire duplicate effect-cleanup persists on notes churn", () => {
    expect(editorSource).not.toContain(
      "void persistEditorContent(boundNoteId, json)",
    );
    expect(editorSource).not.toContain(
      "shouldPersistAutosaveOnEditorEffectCleanup",
    );
  });

  it("uses silent flush persist during note-switch autosave", () => {
    expect(editorSource).toContain("notifyOnError: false");
    expect(editorSource).toContain(
      "await persistEditorContent(activeNoteId, json, undefined, {",
    );
  });

  it("guards debounced autosave against stale note id after switch", () => {
    expect(editorSource).toContain("isDebouncedAutosaveStillCurrent");
    expect(editorSource).toContain("const scheduledNoteId = activeNoteId");
  });

  it("hides restore chip for mark-only playground format QA drafts", () => {
    expect(editorSource).toContain(
      "playgroundEditorMarkOnlyDriftFromStored(\n          pendingDraftContent,",
    );
    expect(editorSource).toMatch(
      /playgroundEditorMarkOnlyDriftFromStored\([\s\S]*return false;/,
    );
  });
});
