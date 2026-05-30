import { describe, expect, it } from "vitest";
import {
  buildPlaygroundContent,
  formatPlaygroundMatchesCanonicalSeed,
} from "@/storage/formatPlaygroundNote";
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
    expect(preview).not.toBe("格式示例");
  });

  it("uses compact label for English playground when app locale is zh", () => {
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
    expect(preview).toBe("Formatting samples");
    expect(
      formatPlaygroundMatchesCanonicalSeed(
        "Format Playground",
        enContent,
        "zh",
      ),
    ).toBe(true);
  });

  it("uses compact label after durable restore even when contentPlain is stale", () => {
    const enContent = JSON.stringify(buildPlaygroundContent("en"));
    const preview = deriveNoteListPreview(
      {
        title: "Format Playground",
        content: enContent,
        contentPlain: "T5-MIXED-stale-plain",
      },
      "Formatting samples",
      "en",
    );
    expect(preview).toBe("Formatting samples");
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
