import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("EditorScreen post-restore AC1 fixes", () => {
  it("bumps write epoch, suppresses chip via state, and seeds title from restored row", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/screens/EditorScreen.tsx"),
      "utf8",
    );

    expect(source).toContain(
      "contentWriteEpochRef.current = bumpPlaygroundWriteEpoch(note.id)",
    );
    expect(source).toContain("applyRestoreChipSuppressed(true)");
    expect(source).toContain(
      "const restoredTitle =\n        restoredNote?.title ?? getFormatPlaygroundTitle(seedLocale)",
    );
    expect(source).toContain("playgroundRestoreChipOverridesSuppress");
    expect(source).toMatch(
      /playgroundRestoreChipOverridesSuppress\([\s\S]*return true;/,
    );
    expect(source).toMatch(
      /if \(restoreChipSuppressed \|\| restoreChipSuppressedRef\.current\) \{\s*return false;\s*\}/,
    );
    expect(source).toContain("skipTitleSyncOnceRef.current = true");
    expect(source).toContain("setTitleValue(restoredTitle)");
    expect(source).toContain("titleInputRef.current?.blur()");
    expect(source).toMatch(
      /applyRestoreChipSuppressed\(true\)[\s\S]*finalizePlaygroundRestoreInEditor/,
    );
    expect(source).toContain("playgroundFormatQaDraftHidesRestoreChip");
    expect(source).toContain("scheduleContentPersist");
    expect(source).toContain("JSON.stringify(editorInstance.getJSON())");
  });
});
