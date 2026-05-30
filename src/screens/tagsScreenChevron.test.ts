import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("TagsScreen chevron hit target", () => {
  it("uses a 24px expand control so trackpad chevron taps do not misclick the row", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/screens/TagsScreen.tsx"),
      "utf8",
    );

    expect(source).toContain('type="button"');
    expect(source).toContain("width: 24");
    expect(source).toContain("height: 24");
    expect(source).toContain("stopPropagation");
  });
});
