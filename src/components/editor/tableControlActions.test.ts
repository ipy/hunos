import { describe, expect, it, vi } from "vitest";
import {
  isTableControlContext,
  TABLE_CONTROL_ITEMS,
} from "./tableControlActions";

function mockEditor(activeTypes: string[], canMap: Record<string, boolean>) {
  const chain = {
    focus: vi.fn().mockReturnThis(),
    addRowAfter: vi.fn().mockReturnThis(),
    addColumnAfter: vi.fn().mockReturnThis(),
    deleteRow: vi.fn().mockReturnThis(),
    deleteColumn: vi.fn().mockReturnThis(),
    run: vi.fn(() => true),
  };

  return {
    isActive: vi.fn((type: string) => activeTypes.includes(type)),
    can: vi.fn(() => ({
      addRowAfter: () => canMap.addRowAfter ?? false,
      addColumnAfter: () => canMap.addColumnAfter ?? false,
      deleteRow: () => canMap.deleteRow ?? false,
      deleteColumn: () => canMap.deleteColumn ?? false,
    })),
    chain: vi.fn(() => chain),
    _chain: chain,
  };
}

describe("tableControlActions", () => {
  it("detects table context", () => {
    expect(isTableControlContext(mockEditor(["table"], {}) as never)).toBe(
      true,
    );
    expect(isTableControlContext(mockEditor(["paragraph"], {}) as never)).toBe(
      false,
    );
  });

  it("runs add row and column commands when allowed", () => {
    const editor = mockEditor(["table"], {
      addRowAfter: true,
      addColumnAfter: true,
      deleteRow: true,
      deleteColumn: true,
    });

    expect(TABLE_CONTROL_ITEMS[0].canExecute(editor as never)).toBe(true);
    expect(TABLE_CONTROL_ITEMS[0].action(editor as never)).toBe(true);
    expect(editor._chain.addRowAfter).toHaveBeenCalled();

    expect(TABLE_CONTROL_ITEMS[1].action(editor as never)).toBe(true);
    expect(editor._chain.addColumnAfter).toHaveBeenCalled();
  });

  it("disables delete controls when the table cannot shrink", () => {
    const editor = mockEditor(["table"], {
      addRowAfter: true,
      addColumnAfter: true,
      deleteRow: false,
      deleteColumn: false,
    });

    expect(TABLE_CONTROL_ITEMS[2].canExecute(editor as never)).toBe(false);
    expect(TABLE_CONTROL_ITEMS[3].canExecute(editor as never)).toBe(false);
  });
});
