import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const editorSource = readFileSync(
  join(process.cwd(), "src/screens/EditorScreen.tsx"),
  "utf-8",
);

describe("EditorScreen playground locale stash", () => {
  it("clears playground stash only on locale change, not note switch", () => {
    expect(editorSource).toMatch(
      /clearStashedEditorAutosave\(\);\s*setEditorSeedContent\(null\);\s*\}, \[settings\.locale\]\);/,
    );
    expect(editorSource).not.toMatch(/\[settings\.locale, note\?\.id\]/);
  });

  it("restores stashed autosave once per note visit after rapid switch", () => {
    expect(editorSource).toContain("stashRestoreHandledForNoteRef");
    expect(editorSource).toContain(
      "stashRestoreHandledForNoteRef.current = null",
    );
    expect(editorSource).toMatch(
      /if \(stashRestoreHandledForNoteRef\.current === note\.id\) return;/,
    );
  });

  it("does not wipe editor seed while playground restore session is active", () => {
    expect(editorSource).toMatch(
      /if \(playgroundRestoreSessionRef\.current\.isActive\(\)\) \{\s*return;\s*\}/,
    );
    expect(editorSource).not.toMatch(
      /if \(playgroundRestoreSessionRef\.current\.isActive\(\)\) \{\s*clearStashedEditorAutosave\(\);\s*setEditorSeedContent\(null\);/,
    );
  });
});
