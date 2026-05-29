import { describe, expect, it } from "vitest";
import { noteContentHasTaskList } from "./noteContentHasTaskList";

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
