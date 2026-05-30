import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const RAWFILE_PATH = join(
  process.cwd(),
  "harmony/entry/src/main/resources/rawfile/index.html",
);

describe("harmony rawfile freshness", () => {
  const rawfile = readFileSync(RAWFILE_PATH, "utf-8");

  it("includes v21 tryHintBullets playground seed", () => {
    expect(rawfile).toContain("tryHintBullets");
    expect(rawfile).toContain("~~strike~~");
    expect(rawfile).toContain("==highlight==");
    expect(rawfile).toContain("~~删除线~~");
    expect(rawfile).toContain("==高亮==");
  });

  it("includes strike and highlight markdown input rules (iter 88/89)", () => {
    expect(rawfile).toContain('strike:{open:"~~"');
    expect(rawfile).toContain('highlight:{open:"=="');
    expect(rawfile).toMatch(/~~\(\?!\\s\+~~\)/);
    expect(rawfile).toMatch(/==\(\?!\\s\+==\)/);
  });

  it("includes bootstrapAppData startup sequence", () => {
    // bootstrapAppData is minified in the bundle; loadNotes runs before locale sync.
    expect(rawfile).toContain('loadNotes({status:"active"})');
    expect(rawfile).toMatch(
      /loadNotes\(\{status:"active"\}\).*focusCanonical/s,
    );
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

  it("defaults ArkWeb first launch to zh locale (iter 92)", () => {
    expect(rawfile).toContain("ArkWeb");
    expect(rawfile).toContain('has("locale")');
    expect(rawfile).toContain("格式试炼场");
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

  it("includes live stats readingTimeMinutes (iter 81 AC8)", () => {
    expect(rawfile).toContain("readingTimeMinutes");
  });

  it("includes addToHistory false on note-switch setContent (iter 81 undo isolation)", () => {
    expect(rawfile).toContain("addToHistory");
  });

  it("links bundled font CSS with relative asset paths (iter 90)", () => {
    expect(rawfile).toMatch(
      /<link rel="stylesheet" href="assets\/style-[^"]+\.css"\/>/,
    );
    expect(rawfile).not.toContain('href="/assets/');
    expect(rawfile).toContain("HarmonyOS Sans SC");
    expect(rawfile).not.toMatch(/font-family:-apple-system,BlinkMacSystemFont/);
  });

  it("ships bundled woff/woff2 font files in rawfile assets (iter 90)", () => {
    const assetsDir = join(
      process.cwd(),
      "harmony/entry/src/main/resources/rawfile/assets",
    );
    const cssFiles = readdirSync(assetsDir).filter((f) =>
      f.startsWith("style-"),
    );
    expect(cssFiles.length).toBeGreaterThan(0);

    const css = readFileSync(join(assetsDir, cssFiles[0]!), "utf-8");
    expect(css).toContain("@font-face");
    expect(css).toMatch(/url\(\.\/inter-[^)]+\.woff2\)/);
    expect(css).not.toContain("url(/assets/");

    const fontFiles = readdirSync(assetsDir).filter((f) =>
      /\.(woff2?|ttf)$/i.test(f),
    );
    expect(fontFiles.length).toBeGreaterThanOrEqual(100);
  });
});
