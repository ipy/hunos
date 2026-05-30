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

describe("exportNote text format", () => {
  it("returns empty string when contentPlain is undefined", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Body" }],
        },
      ],
    });
    (note as { contentPlain?: string }).contentPlain = undefined;

    expect(exportNote(note, "text")).toBe("");
  });

  it("still exports markdown from content when contentPlain is undefined", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Body" }],
        },
      ],
    });
    (note as { contentPlain?: string }).contentPlain = undefined;

    expect(exportNote(note, "markdown")).toBe("Body");
  });
});

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

describe("exportNote markdown inline marks", () => {
  it("exports highlight as ==text==", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "HighlightIter89",
              marks: [{ type: "highlight" }],
            },
          ],
        },
      ],
    });

    expect(exportNote(note, "markdown")).toBe("==HighlightIter89==");
  });

  it("exports strike as ~~text~~", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "StrikeIter88",
              marks: [{ type: "strike" }],
            },
          ],
        },
      ],
    });

    expect(exportNote(note, "markdown")).toBe("~~StrikeIter88~~");
  });

  it("exports italic as *text*", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "ItalicExport91",
              marks: [{ type: "italic" }],
            },
          ],
        },
      ],
    });

    expect(exportNote(note, "markdown")).toBe("*ItalicExport91*");
  });

  it("exports inline code as `text`", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "CodeExport91",
              marks: [{ type: "code" }],
            },
          ],
        },
      ],
    });

    expect(exportNote(note, "markdown")).toBe("`CodeExport91`");
  });
});

describe("exportNote markdown links", () => {
  it("exports external links as GFM markdown", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Example Site",
              marks: [
                {
                  type: "link",
                  attrs: { href: "https://example.com" },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(exportNote(note, "markdown")).toBe(
      "[Example Site](https://example.com)",
    );
  });

  it("exports autolinked URLs as markdown links", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "https://hunos.dev",
              marks: [
                {
                  type: "link",
                  attrs: { href: "https://hunos.dev" },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(exportNote(note, "markdown")).toBe(
      "[https://hunos.dev](https://hunos.dev)",
    );
  });

  it("keeps wiki-links as plain bracket syntax", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "[[Welcome to Hunos]]" }],
        },
      ],
    });

    expect(exportNote(note, "markdown")).toBe("[[Welcome to Hunos]]");
  });

  it("exports links alongside wiki-links in one paragraph", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "See " },
            {
              type: "text",
              text: "project docs",
              marks: [
                {
                  type: "link",
                  attrs: { href: "https://example.com" },
                },
              ],
            },
            { type: "text", text: " and " },
            { type: "text", text: "[[Welcome to Hunos]]" },
          ],
        },
      ],
    });

    const markdown = exportNote(note, "markdown");
    expect(markdown).toContain("[project docs](https://example.com)");
    expect(markdown).toContain("[[Welcome to Hunos]]");
  });
});

describe("exportNote html links", () => {
  it("exports external links with safe attributes", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Example Site",
              marks: [
                {
                  type: "link",
                  attrs: { href: "https://example.com" },
                },
              ],
            },
          ],
        },
      ],
    });

    const html = exportNote(note, "html");
    expect(html).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Example Site</a>',
    );
  });

  it("keeps wiki-links as plain text in HTML export", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "[[Welcome to Hunos]]" }],
        },
      ],
    });

    const html = exportNote(note, "html");
    expect(html).toContain("[[Welcome to Hunos]]");
    expect(html).not.toContain("<a");
  });
});

describe("exportNote html task items", () => {
  it("exports unchecked tasks without strike styling", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Open task" }],
                },
              ],
            },
          ],
        },
      ],
    });

    const html = exportNote(note, "html");
    expect(html).toContain('<ul class="task-list">');
    expect(html).toContain('<input type="checkbox" disabled>');
    expect(html).not.toContain(" checked");
    expect(html).not.toContain("<del");
    expect(html).toContain("Open task");
  });

  it("exports checked tasks with del.task-done and muted strike CSS", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { checked: true },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Completed task" }],
                },
              ],
            },
          ],
        },
      ],
    });

    const html = exportNote(note, "html");
    expect(html).toContain('<input type="checkbox" checked disabled>');
    expect(html).toContain('data-checked="true"');
    expect(html).toContain('<del class="task-done">');
    expect(html).toContain("Completed task");
    expect(html).toContain(
      'ul.task-list li[data-checked="true"] del.task-done{color:#AEAEB2;text-decoration:line-through}',
    );
  });
});

describe("exportNote images", () => {
  const sampleSrc =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  it("exports embedded images as GFM markdown", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: sampleSrc },
        },
      ],
    });

    expect(exportNote(note, "markdown")).toBe(`![](${sampleSrc})`);
  });

  it("exports image alt text in markdown", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: sampleSrc, alt: "Screenshot" },
        },
      ],
    });

    expect(exportNote(note, "markdown")).toBe(`![Screenshot](${sampleSrc})`);
  });

  it("exports embedded images in HTML", () => {
    const note = makeNote({
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: sampleSrc, alt: "Sample" },
        },
      ],
    });

    const html = exportNote(note, "html");
    expect(html).toContain(`src="${sampleSrc}"`);
    expect(html).toContain('alt="Sample"');
    expect(html).toContain('class="editor-image"');
  });
});
