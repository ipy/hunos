import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const RAWFILE_PATH = join(
  process.cwd(),
  "harmony/entry/src/main/resources/rawfile/index.html",
);

describe("harmony rawfile freshness", () => {
  const rawfile = readFileSync(RAWFILE_PATH, "utf-8");

  it("includes v20 tryHintBullets playground seed", () => {
    expect(rawfile).toContain("tryHintBullets");
  });

  it("includes bootstrapAppData startup sequence", () => {
    // bootstrapAppData is minified in the bundle; its call chain remains stable.
    expect(rawfile).toContain('loadNotes({status:"active"})');
    expect(rawfile).toContain("loadTags()");
    expect(rawfile).toContain("purgeTrash");
  });

  it("does not include removed wiki-link-bracket-visible CSS", () => {
    expect(rawfile).not.toContain(".wiki-link-bracket-visible {");
  });
});
