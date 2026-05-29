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

describe("exportNote markdown tables", () => {
  it("exports header row, separator, and data rows", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Name" }],
                    },
                  ],
                },
                {
                  type: "tableHeader",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Type" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Alpha" }],
                    },
                  ],
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Beta" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(exportNote(note, "markdown")).toBe(
      "| Name | Type |\n| --- | --- |\n| Alpha | Beta |",
    );
  });

  it("exports edited multi-row tables", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Bold" }],
                    },
                  ],
                },
                {
                  type: "tableHeader",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Mark" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Edited" }],
                    },
                  ],
                },
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Italic" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(exportNote(note, "markdown")).toContain("| Bold | Mark |");
    expect(exportNote(note, "markdown")).toContain("| --- | --- |");
    expect(exportNote(note, "markdown")).toContain("| Edited | Italic |");
  });
});
