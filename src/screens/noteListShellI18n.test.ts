import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("NoteListScreen shell i18n", () => {
  it("uses translated pinned section label", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/screens/NoteListScreen.tsx"),
      "utf8",
    );
    expect(source).toContain('t("notes.list.pinned")');
    expect(source).not.toMatch(/>\s*Pinned\s*</);
  });
});
