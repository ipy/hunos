import { describe, expect, it } from "vitest";
import { exportNote } from "./export";
import type { Note } from "@/types/note";

function makeNote(content: object): Note {
  return {
    id: "note-1",
    title: "Test",
    content: JSON.stringify(content),
    contentPlain: "",
    createdAt: 0,
    modifiedAt: 0,
    isPinned: false,
    status: "active",
    trashedAt: null,
    wordCount: 0,
  };
}

describe("exportNote markdown code blocks", () => {
  it("exports plain fences when language is missing", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "codeBlock",
          content: [{ type: "text", text: "const x = 1;" }],
        },
      ],
    });

    expect(exportNote(note, "markdown")).toBe("```\nconst x = 1;```");
  });

  it("exports language tag when language attr is set", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "codeBlock",
          attrs: { language: "javascript" },
          content: [
            {
              type: "text",
              text: 'function greet() { return "hi"; }',
            },
          ],
        },
      ],
    });

    expect(exportNote(note, "markdown")).toBe(
      '```javascript\nfunction greet() { return "hi"; }```',
    );
  });
});
