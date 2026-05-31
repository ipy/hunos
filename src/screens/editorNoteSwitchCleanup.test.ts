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
    expect(editorSource).toContain("persistEditorContent(");
    expect(editorSource).toContain("activeNoteId, json");
    expect(editorSource).toContain("resolveEditorAutosaveContentJson");
  });

  it("uses silent debounced autosave during editing", () => {
    expect(editorSource).toContain("scheduleContentPersist");
    expect(editorSource).toContain("notifyOnError: false");
  });

  it("hides restore chip for mark-only playground format QA drafts", () => {
    expect(editorSource).toContain("playgroundFormatQaDraftHidesRestoreChip");
    expect(editorSource).toMatch(
      /playgroundFormatQaDraftHidesRestoreChip\([\s\S]*return false;/,
    );
  });
});
