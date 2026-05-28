import { describe, expect, it } from "vitest";
import type { Editor } from "@tiptap/core";
import { getOutlineListItemType } from "./listOutlineUtils";

function mockEditor(activeNodes: string[]): Editor {
  return {
    isActive: (name: string) => activeNodes.includes(name),
  } as Editor;
}

describe("getOutlineListItemType", () => {
  it("returns listItem when active in a bullet or ordered list", () => {
    expect(getOutlineListItemType(mockEditor(["listItem", "bulletList"]))).toBe(
      "listItem",
    );
    expect(
      getOutlineListItemType(mockEditor(["listItem", "orderedList"])),
    ).toBe("listItem");
  });

  it("returns taskItem when active in a task list", () => {
    expect(getOutlineListItemType(mockEditor(["taskItem", "taskList"]))).toBe(
      "taskItem",
    );
  });

  it("prefers taskItem when both task and list nodes are active", () => {
    expect(getOutlineListItemType(mockEditor(["taskItem", "listItem"]))).toBe(
      "taskItem",
    );
  });

  it("returns null outside list items", () => {
    expect(getOutlineListItemType(mockEditor(["paragraph"]))).toBeNull();
  });

  it("returns null in blocked contexts even when a list item is active", () => {
    expect(
      getOutlineListItemType(mockEditor(["listItem", "codeBlock"])),
    ).toBeNull();
    expect(
      getOutlineListItemType(mockEditor(["listItem", "blockquote"])),
    ).toBeNull();
    expect(
      getOutlineListItemType(mockEditor(["listItem", "tableCell"])),
    ).toBeNull();
    expect(
      getOutlineListItemType(mockEditor(["taskItem", "tableHeader"])),
    ).toBeNull();
    expect(
      getOutlineListItemType(mockEditor(["listItem", "table"])),
    ).toBeNull();
  });
});
