import { describe, expect, it } from "vitest";
import {
  buildPlaygroundContent,
  formatPlaygroundMatchesCanonicalSeed,
  getFormatPlaygroundIntroExcerpt,
} from "@/storage/formatPlaygroundNote";
import { extractPlainTextFromTiptap } from "@/graph/linkExtractor";
import { deriveNoteListPreview } from "@/utils/noteListPreview";
import { isFormatPlaygroundNote } from "@/storage/formatPlaygroundNote";

describe("deriveNoteListPreview", () => {
  it("uses seed intro for unmodified zh playground content", () => {
    const seedPlain = extractPlainTextFromTiptap(buildPlaygroundContent("zh"));
    const preview = deriveNoteListPreview(
      {
        title: "格式试炼场",
        content: JSON.stringify(buildPlaygroundContent("zh")),
        contentPlain: seedPlain,
      },
      "格式示例",
      "zh",
    );
    expect(preview).toBe(getFormatPlaygroundIntroExcerpt("zh"));
    expect(preview).toContain("在这一篇笔记里测试所有格式");
    expect(preview).not.toBe("格式示例");
  });

  it("shows plain-text excerpt after playground body edits", () => {
    const seed = buildPlaygroundContent("zh");
    const seedPlain = extractPlainTextFromTiptap(seed);
    const marker = "T2-BODY-iter3-marker";
    const parsed = JSON.parse(JSON.stringify(seed)) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    parsed.content.push({
      type: "paragraph",
      content: [{ type: "text", text: marker }],
    });
    const preview = deriveNoteListPreview(
      {
        title: "格式试炼场",
        content: JSON.stringify(parsed),
        contentPlain: `${seedPlain}\n${marker}`,
      },
      "格式示例",
      "zh",
    );
    expect(preview).toContain(marker);
    expect(preview).not.toBe(getFormatPlaygroundIntroExcerpt("zh"));
  });

  it("uses English seed intro when app locale is zh", () => {
    const enContent = JSON.stringify(buildPlaygroundContent("en"));
    const preview = deriveNoteListPreview(
      {
        title: "Format Playground",
        content: enContent,
        contentPlain: extractPlainTextFromTiptap(buildPlaygroundContent("en")),
      },
      "Formatting samples",
      "zh",
    );
    expect(preview).toBe(getFormatPlaygroundIntroExcerpt("en"));
    expect(preview).toContain("Test every format");
    expect(
      formatPlaygroundMatchesCanonicalSeed(
        "Format Playground",
        enContent,
        "zh",
      ),
    ).toBe(true);
  });

  it("uses seed intro after durable restore even when contentPlain is stale", () => {
    const enContent = JSON.stringify(buildPlaygroundContent("en"));
    const preview = deriveNoteListPreview(
      {
        title: "Format Playground",
        content: enContent,
        contentPlain: "T6-MIXED-stale-plain",
      },
      "Formatting samples",
      "en",
    );
    expect(preview).toBe(getFormatPlaygroundIntroExcerpt("en"));
    expect(preview).toContain("Test every format");
    expect(preview).not.toBe("Formatting samples");
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
