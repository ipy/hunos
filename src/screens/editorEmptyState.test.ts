import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const editorSource = readFileSync(
  join(process.cwd(), "src/screens/EditorScreen.tsx"),
  "utf-8",
);

describe("EditorScreen empty pane", () => {
  it("uses select prompt when notes exist but none is active", () => {
    expect(editorSource).toContain("notes.selectPrompt");
    expect(editorSource).toContain("const hasNotes = notes.length > 0");
    expect(editorSource).toContain(
      'hasNotes ? t("notes.selectPrompt") : t("notes.empty")',
    );
  });
});
