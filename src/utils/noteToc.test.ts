import { describe, expect, it } from "vitest";
import { deriveToc, extractTocFromContent, extractTocFromDoc } from "./noteToc";
import type { Note } from "@/types/note";
import type { Editor } from "@tiptap/react";

function baseNote(overrides: Partial<Note> = {}): Note {
  return {
    id: "n1",
    title: "Test",
    content: "",
    contentPlain: "",
    isPinned: false,
    status: "active",
    trashedAt: null,
    createdAt: 0,
    modifiedAt: 0,
    wordCount: 0,
    ...overrides,
  };
}

const sampleDoc = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Intro" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Body" }],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Iter92 Live Heading" }],
    },
  ],
};

describe("extractTocFromDoc", () => {
  it("returns headings in document order", () => {
    expect(extractTocFromDoc(sampleDoc)).toEqual([
      { level: 1, text: "Intro" },
      { level: 2, text: "Iter92 Live Heading" },
    ]);
  });

  it("skips headings with empty text", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Visible" }],
        },
      ],
    };
    expect(extractTocFromDoc(doc)).toEqual([{ level: 2, text: "Visible" }]);
  });

  it("includes nested headings to match scrollToTocIndex", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            {
              type: "heading",
              attrs: { level: 3 },
              content: [{ type: "text", text: "Nested" }],
            },
          ],
        },
      ],
    };
    expect(extractTocFromDoc(doc)).toEqual([{ level: 3, text: "Nested" }]);
  });
});

describe("extractTocFromContent", () => {
  it("parses persisted note JSON", () => {
    const content = JSON.stringify(sampleDoc);
    expect(extractTocFromContent(content)).toEqual([
      { level: 1, text: "Intro" },
      { level: 2, text: "Iter92 Live Heading" },
    ]);
  });

  it("returns empty list for invalid JSON", () => {
    expect(extractTocFromContent("not json")).toEqual([]);
  });
});

describe("deriveToc", () => {
  it("prefers live editor JSON over stale persisted content", () => {
    const staleContent = JSON.stringify(sampleDoc);
    const liveDoc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Iter92 Renamed Heading" }],
        },
      ],
    };
    const editor = { getJSON: () => liveDoc } as unknown as Editor;
    const note = baseNote({ content: staleContent });

    expect(deriveToc(note, editor)).toEqual([
      { level: 2, text: "Iter92 Renamed Heading" },
    ]);
  });

  it("falls back to note content when editor is null", () => {
    const note = baseNote({ content: JSON.stringify(sampleDoc) });
    expect(deriveToc(note, null)).toEqual([
      { level: 1, text: "Intro" },
      { level: 2, text: "Iter92 Live Heading" },
    ]);
  });
});
