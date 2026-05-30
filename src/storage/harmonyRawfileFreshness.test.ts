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

  it("includes resolveInsertedImagePos selection.from-1 fallback", () => {
    expect(rawfile).toContain("selection.from-1");
  });

  it("includes focusCanonical playground locale sync", () => {
    expect(rawfile).toContain("focusCanonical");
  });

  it("includes zh playgroundFlushDropped copy", () => {
    expect(rawfile).toContain("playgroundFlushDropped");
  });

  it("persists block-image height without transient editor floor attrs", () => {
    expect(rawfile).not.toContain("data-block-image-floor");
    expect(rawfile).not.toContain('not([style*="height"])');
    // Storage-boundary migration strips legacy JSON floor flag (iter 72).
    expect(rawfile).toContain("dataBlockImageFloor");
  });
});
