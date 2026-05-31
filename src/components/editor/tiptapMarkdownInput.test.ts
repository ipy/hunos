import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MarkdownBold,
  MarkdownCode,
  MarkdownHighlight,
  MarkdownItalic,
  MarkdownStrike,
} from "./MarkdownShortcuts";
import { MarkdownStarDebrisCleanup } from "./MarkdownStarDebrisCleanup";

describe("TiptapEditor inline markdown wiring", () => {
  it("registers bold, italic, code, strike, and highlight input extensions", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/editor/TiptapEditor.tsx"),
      "utf8",
    );

    expect(source).toContain("MarkdownBold");
    expect(source).toContain("MarkdownItalic");
    expect(source).toContain("MarkdownCode");
    expect(source).toContain("MarkdownStrike");
    expect(source).toContain("MarkdownStarDebrisCleanup");
    expect(source).toContain("DocumentEndKeyboardShortcuts");
    expect(source).toContain("code: false");
  });

  it("exports input-rule extensions for inline markdown marks", () => {
    for (const extension of [
      MarkdownBold,
      MarkdownItalic,
      MarkdownCode,
      MarkdownStrike,
      MarkdownHighlight,
      MarkdownStarDebrisCleanup,
    ]) {
      expect(extension.name).toBeTruthy();
    }
  });

  it("registers MarkdownCode with elevated priority for backtick input", () => {
    expect(MarkdownCode.config.priority).toBe(1100);
  });
});
