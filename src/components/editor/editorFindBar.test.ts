import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EDITOR_REPLACE_ALL_TESTID,
  EDITOR_REPLACE_ONE_TESTID,
} from "./EditorFindBar";

const findBarSource = readFileSync(
  join(process.cwd(), "src/components/editor/EditorFindBar.tsx"),
  "utf-8",
);

describe("EditorFindBar replace automation testids", () => {
  it("exports stable replace button testids", () => {
    expect(EDITOR_REPLACE_ONE_TESTID).toBe("editor-replace-one");
    expect(EDITOR_REPLACE_ALL_TESTID).toBe("editor-replace-all");
  });

  it("wires replace button testids in replace mode", () => {
    expect(findBarSource).toContain(`data-testid={EDITOR_REPLACE_ONE_TESTID}`);
    expect(findBarSource).toContain(`data-testid={EDITOR_REPLACE_ALL_TESTID}`);
    expect(findBarSource).toContain("{showReplace && (");
  });
});
