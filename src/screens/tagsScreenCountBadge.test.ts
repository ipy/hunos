import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("TagsScreen count badge policy", () => {
  it("omits count badge when a tag row has only one note", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/screens/TagsScreen.tsx"),
      "utf8",
    );

    expect(source).toContain("{node.noteCount > 1 && (");
    expect(source).toContain("{node.noteCount}");
  });
});
