import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const editorSource = readFileSync(
  join(process.cwd(), "src/screens/EditorScreen.tsx"),
  "utf-8",
);

describe("EditorScreen restore playground visibility", () => {
  it("shows restore only for canonical playground titles", () => {
    expect(editorSource).toContain("showRestorePlayground");
    expect(editorSource).toContain(
      "FORMAT_PLAYGROUND_TITLES.includes(note.title)",
    );
    expect(editorSource).toContain("persistUnloadDraftSync");
  });
});
