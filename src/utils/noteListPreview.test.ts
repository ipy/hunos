import { describe, expect, it } from "vitest";
import { deriveNoteListPreview } from "@/utils/noteListPreview";
import { isFormatPlaygroundNote } from "@/storage/formatPlaygroundNote";

describe("deriveNoteListPreview", () => {
  it("uses compact playground label instead of full excerpt", () => {
    const longPlain = "格式试炼场 ".repeat(40);
    const preview = deriveNoteListPreview(
      {
        title: "格式试炼场",
        content: JSON.stringify({ type: "doc", content: [] }),
        contentPlain: longPlain,
      },
      "Formatting samples",
    );
    expect(preview).toBe("Formatting samples");
    expect(preview).not.toContain(longPlain.slice(0, 20));
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
    );
    expect(preview.length).toBeLessThanOrEqual(120);
  });

  it("detects playground notes by title", () => {
    expect(isFormatPlaygroundNote("Format Playground")).toBe(true);
    expect(isFormatPlaygroundNote("格式试炼场")).toBe(true);
  });
});
