import { describe, expect, it } from "vitest";
import type { Editor } from "@tiptap/core";
import {
  handleTableShiftTab,
  handleTableTab,
  isTableShortcutContext,
  shouldDeferTableTab,
} from "./tableKeyboardUtils";

function mockEditor(activeNodes: string[]): Editor {
  return {
    isActive: (name: string) => activeNodes.includes(name),
    commands: {
      goToNextCell: () => true,
      goToPreviousCell: () => true,
      addRowAfter: () => true,
    },
    can: () => ({
      addRowAfter: () => true,
    }),
    chain: () => ({
      addRowAfter: () => ({
        goToNextCell: () => ({
          run: () => true,
        }),
      }),
    }),
  } as unknown as Editor;
}

describe("isTableShortcutContext", () => {
  it("is true when caret is in a table", () => {
    expect(isTableShortcutContext(mockEditor(["table", "tableCell"]))).toBe(
      true,
    );
  });

  it("is false outside tables", () => {
    expect(isTableShortcutContext(mockEditor(["paragraph"]))).toBe(false);
  });
});

describe("handleTableTab", () => {
  it("returns false outside tables", () => {
    expect(handleTableTab(mockEditor(["paragraph"]))).toBe(false);
  });

  it("navigates cells inside tables", () => {
    expect(handleTableTab(mockEditor(["table", "tableCell"]), false)).toBe(
      true,
    );
  });

  it("adds a row when Tab reaches the last cell", () => {
    const editor = mockEditor(["table", "tableCell"]);
    editor.commands.goToNextCell = () => false;
    expect(handleTableTab(editor, false)).toBe(true);
  });
});

describe("handleTableShiftTab", () => {
  it("returns false outside tables", () => {
    expect(handleTableShiftTab(mockEditor(["paragraph"]))).toBe(false);
  });

  it("moves to the previous cell inside tables", () => {
    expect(handleTableShiftTab(mockEditor(["table", "tableCell"]), false)).toBe(
      true,
    );
  });
});

describe("shouldDeferTableTab", () => {
  it("does not defer Shift+Tab for suggestion menus", () => {
    expect(shouldDeferTableTab(false, false)).toBe(false);
  });

  it("defers Tab when a suggestion menu is open", () => {
    expect(shouldDeferTableTab(true, true)).toBe(true);
  });
});
