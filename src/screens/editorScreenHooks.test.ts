import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const editorScreenSource = readFileSync(
  join(process.cwd(), "src/screens/EditorScreen.tsx"),
  "utf-8",
);

describe("EditorScreen hooks order", () => {
  it("computes showRestorePlayground before the empty-note early return", () => {
    const restoreMemo = editorScreenSource.indexOf(
      "const showRestorePlayground = useMemo",
    );
    const emptyNoteReturn = editorScreenSource.indexOf("if (!note) {");
    expect(restoreMemo).toBeGreaterThan(-1);
    expect(emptyNoteReturn).toBeGreaterThan(-1);
    expect(restoreMemo).toBeLessThan(emptyNoteReturn);
  });
});
