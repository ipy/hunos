import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const editorSource = readFileSync(
  join(process.cwd(), "src/screens/EditorScreen.tsx"),
  "utf-8",
);

describe("EditorScreen playground lifecycle flush", () => {
  it("persists editor body on lifecycle flush and stashes when persist fails", () => {
    const flushStart = editorSource.indexOf("const flushPendingAutosave =");
    const flushEnd = editorSource.indexOf("useEffect(() => {", flushStart);
    const flushBlock = editorSource.slice(flushStart, flushEnd);
    expect(flushBlock).toContain("persistEditorContent(");
    expect(flushBlock).toContain("activeNoteId, json");
    expect(flushBlock).toContain("notifyOnError: false");
    expect(flushBlock).toContain(
      "stashEditorAutosaveSnapshot(activeNoteId, json)",
    );
    expect(flushBlock).toContain("persisted: titleOk && contentOk");
    expect(flushBlock).not.toContain("persisted: false");
  });
});
