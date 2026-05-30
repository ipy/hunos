import { describe, expect, it } from "vitest";
import { buildPlaygroundContent } from "@/storage/formatPlaygroundNote";
import { extractPlainTextFromTiptap } from "@/graph/linkExtractor";
import { deriveNoteListPreview } from "@/utils/noteListPreview";
import { isFormatPlaygroundNote } from "@/storage/formatPlaygroundNote";

describe("deriveNoteListPreview", () => {
  it("uses compact playground label for unmodified seed content", () => {
    const seedPlain = extractPlainTextFromTiptap(buildPlaygroundContent("zh"));
    const preview = deriveNoteListPreview(
      {
        title: "格式试炼场",
        content: JSON.stringify(buildPlaygroundContent("zh")),
        contentPlain: seedPlain,
      },
      "Formatting samples",
      "zh",
    );
    expect(preview).toBe("Formatting samples");
    expect(preview).not.toContain(seedPlain.slice(0, 20));
  });

  it("shows plain-text excerpt after playground body edits", () => {
    const seedPlain = extractPlainTextFromTiptap(buildPlaygroundContent("zh"));
    const marker = "T2-BODY-iter3-marker";
    const preview = deriveNoteListPreview(
      {
        title: "格式试炼场",
        content: JSON.stringify(buildPlaygroundContent("zh")),
        contentPlain: `${seedPlain}\n${marker}`,
      },
      "格式示例",
      "zh",
    );
    expect(preview).toContain(marker);
    expect(preview).not.toBe("格式示例");
  });

  it("truncates regular note plain text", () => {
    const plain = "a".repeat(200);
    const preview = deriveNoteListPreview(
      {
        title: "Meeting",
        content: "{}",
        contentPlain: plain,
      },
      "Formatting samples",
      "en",
    );
    expect(preview.length).toBeLessThanOrEqual(120);
  });

  it("detects playground notes by title", () => {
    expect(isFormatPlaygroundNote("Format Playground")).toBe(true);
    expect(isFormatPlaygroundNote("格式试炼场")).toBe(true);
  });
});
