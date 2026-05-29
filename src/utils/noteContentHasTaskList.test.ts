import type { Editor } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import {
  editorHasTaskList,
  noteContentHasTaskList,
} from "./noteContentHasTaskList";

function mockEditor(doc: Record<string, unknown>): Editor {
  return {
    getJSON: () => doc,
  } as unknown as Editor;
}

describe("noteContentHasTaskList", () => {
  it("returns false for empty content", () => {
    expect(noteContentHasTaskList("")).toBe(false);
  });

  it("returns false for invalid JSON", () => {
    expect(noteContentHasTaskList("not json")).toBe(false);
  });

  it("returns false when note has no task lists", () => {
    const content = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "hello" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "item" }],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(noteContentHasTaskList(content)).toBe(false);
  });

  it("returns true when note contains a task list", () => {
    const content = JSON.stringify({
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
                  content: [{ type: "text", text: "open" }],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(noteContentHasTaskList(content)).toBe(true);
  });

  it("finds nested task lists anywhere in the document tree", () => {
    const content = JSON.stringify({
      type: "doc",
      content: [
        {
          type: "blockquote",
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
                      content: [{ type: "text", text: "done" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(noteContentHasTaskList(content)).toBe(true);
  });
});

describe("editorHasTaskList", () => {
  it("returns false when editor is null", () => {
    expect(editorHasTaskList(null)).toBe(false);
  });

  it("returns false when editor has no task lists", () => {
    const editor = mockEditor({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "hello" }],
        },
      ],
    });

    expect(editorHasTaskList(editor)).toBe(false);
  });

  it("returns true when live editor doc contains a task list", () => {
    const editor = mockEditor({
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
                  content: [{ type: "text", text: "即时隐藏测试" }],
                },
              ],
            },
          ],
        },
      ],
    });

    expect(editorHasTaskList(editor)).toBe(true);
  });
});
