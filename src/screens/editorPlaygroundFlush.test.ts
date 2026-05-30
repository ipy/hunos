import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const editorSource = readFileSync(
  join(process.cwd(), "src/screens/EditorScreen.tsx"),
  "utf-8",
);

describe("EditorScreen playground lifecycle flush", () => {
  it("reports persisted false when playground body is memory-stashed", () => {
    const playgroundBranch = editorSource.slice(
      editorSource.indexOf("if (isPlayground)"),
      editorSource.indexOf("const contentOk = await persistEditorContent"),
    );
    expect(playgroundBranch).toContain("stashEditorAutosaveSnapshot");
    expect(playgroundBranch).toContain("persisted: false");
    expect(playgroundBranch).not.toContain("persisted: titleOk");
  });
});
