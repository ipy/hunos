import { describe, expect, it, vi } from "vitest";
import {
  attachEditorOverlaySelectionSync,
  captureEditorOverlaySelection,
  clearEditorOverlaySelection,
  focusEditorWithOverlaySelection,
  getSavedEditorOverlaySelection,
  restoreEditorOverlaySelection,
  restoreEditorSelectionOnOverlayDismiss,
  runToolbarActionWithOverlaySelection,
  getOverlayToolbarAnchorPos,
  runToolbarChain,
  setEditorFormatOverlayPanelOpen,
  shouldUseSavedToolbarSelection,
  syncEditorOverlaySelectionBeforeToolbarCommand,
} from "./editorOverlaySelection";

function mockEditor(selection: { from: number; to: number }, docSize = 100) {
  const chain = {
    focus: vi.fn().mockReturnThis(),
    setTextSelection: vi.fn().mockReturnThis(),
    toggleBold: vi.fn().mockReturnThis(),
    run: vi.fn(() => true),
  };

  return {
    isDestroyed: false,
    state: {
      selection,
      doc: { content: { size: docSize } },
    },
    commands: {
      focus: vi.fn(() => true),
      setTextSelection: vi.fn(() => true),
    },
    chain: vi.fn(() => chain),
    _chain: chain,
  };
}

describe("editorOverlaySelection", () => {
  it("captures and restores the editor selection while an overlay is open", () => {
    clearEditorOverlaySelection();
    const editor = mockEditor({ from: 42, to: 58 });

    captureEditorOverlaySelection(editor as never);
    expect(getSavedEditorOverlaySelection()).toEqual({ from: 42, to: 58 });

    const restored = restoreEditorOverlaySelection(editor as never);
    expect(restored).toBe(true);
    expect(editor.commands.setTextSelection).toHaveBeenCalledWith({
      from: 42,
      to: 58,
    });
  });

  it("focuses and restores selection in one chain for toolbar commands", () => {
    clearEditorOverlaySelection();
    const editor = mockEditor({ from: 10, to: 20 });

    captureEditorOverlaySelection(editor as never);
    expect(focusEditorWithOverlaySelection(editor as never)).toBe(true);
    expect(editor._chain.focus).toHaveBeenCalled();
    expect(editor._chain.setTextSelection).toHaveBeenCalledWith({
      from: 10,
      to: 20,
    });
    expect(editor._chain.run).toHaveBeenCalled();
  });

  it("applies toolbar commands in the same chain as overlay selection restore", () => {
    clearEditorOverlaySelection();
    const editor = mockEditor({ from: 5, to: 15 });
    captureEditorOverlaySelection(editor as never);

    runToolbarChain(editor as never, true, (chain) => chain.toggleBold());

    expect(editor._chain.setTextSelection).toHaveBeenCalledWith({
      from: 5,
      to: 15,
    });
    expect(editor._chain.toggleBold).toHaveBeenCalled();
    expect(editor._chain.run).toHaveBeenCalledTimes(1);
  });

  it("runs toolbar actions with overlay context for nested chain helpers", () => {
    clearEditorOverlaySelection();
    const editor = mockEditor({ from: 5, to: 15 });
    captureEditorOverlaySelection(editor as never);
    const action = vi.fn();

    runToolbarActionWithOverlaySelection(editor as never, true, action);

    expect(action).toHaveBeenCalledWith(editor);
  });

  it("clears saved selection when overlays close", () => {
    captureEditorOverlaySelection(mockEditor({ from: 1, to: 3 }) as never);
    clearEditorOverlaySelection();
    expect(getSavedEditorOverlaySelection()).toBeNull();
  });

  it("restores bookmark into the editor on overlay dismiss and keeps it for blur sync", () => {
    clearEditorOverlaySelection();
    const editor = mockEditor({ from: 42, to: 58 });

    captureEditorOverlaySelection(editor as never);
    expect(restoreEditorSelectionOnOverlayDismiss(editor as never)).toBe(true);
    expect(editor._chain.setTextSelection).toHaveBeenCalledWith({
      from: 42,
      to: 58,
    });
    expect(getSavedEditorOverlaySelection()).toEqual({ from: 42, to: 58 });
  });

  it("uses saved non-empty bookmark when live selection collapsed after overlay close", () => {
    clearEditorOverlaySelection();
    const editor = mockEditor({ from: 0, to: 0 });
    captureEditorOverlaySelection({
      state: {
        selection: { from: 42, to: 58 },
        doc: { content: { size: 100 } },
      },
    } as never);

    expect(shouldUseSavedToolbarSelection(editor as never)).toBe(true);
    expect(getOverlayToolbarAnchorPos(editor as never)).toBe(42);

    runToolbarChain(editor as never, false, (chain) => chain.toggleBold());
    expect(editor._chain.setTextSelection).toHaveBeenCalledWith({
      from: 42,
      to: 58,
    });
  });

  it("captures non-empty selections via selectionUpdate only while overlay panel is open", () => {
    clearEditorOverlaySelection();
    setEditorFormatOverlayPanelOpen(false);
    const handlers: Record<string, () => void> = {};
    const editor = {
      isDestroyed: false,
      state: {
        selection: { from: 1, to: 1 },
        doc: { content: { size: 100 } },
      },
      on: vi.fn((event: string, handler: () => void) => {
        handlers[event] = handler;
      }),
      off: vi.fn(),
    };

    const detach = attachEditorOverlaySelectionSync(editor as never);
    editor.state.selection = { from: 20, to: 35 };
    handlers.selectionUpdate();
    expect(getSavedEditorOverlaySelection()).toBeNull();

    setEditorFormatOverlayPanelOpen(true);
    handlers.selectionUpdate();
    expect(getSavedEditorOverlaySelection()).toEqual({ from: 20, to: 35 });

    detach();
    setEditorFormatOverlayPanelOpen(false);
    expect(editor.off).toHaveBeenCalledWith(
      "selectionUpdate",
      handlers.selectionUpdate,
    );
  });

  it("clears a post-dismiss bookmark when the user makes a new non-empty selection", () => {
    clearEditorOverlaySelection();
    setEditorFormatOverlayPanelOpen(false);
    captureEditorOverlaySelection(mockEditor({ from: 10, to: 20 }) as never);

    const handlers: Record<string, () => void> = {};
    const editor = {
      isDestroyed: false,
      state: {
        selection: { from: 1, to: 1 },
        doc: { content: { size: 100 } },
      },
      on: vi.fn((event: string, handler: () => void) => {
        handlers[event] = handler;
      }),
      off: vi.fn(),
    };

    attachEditorOverlaySelectionSync(editor as never);
    editor.state.selection = { from: 50, to: 60 };
    handlers.selectionUpdate();

    expect(getSavedEditorOverlaySelection()).toBeNull();
  });

  it("syncs live ranges before toolbar actions when format overlay is closed", () => {
    clearEditorOverlaySelection();
    setEditorFormatOverlayPanelOpen(false);
    const editor = mockEditor({ from: 1, to: 2 });
    captureEditorOverlaySelection(editor as never);
    editor.state.selection = { from: 40, to: 55 };
    const action = vi.fn();

    runToolbarActionWithOverlaySelection(editor as never, false, action);

    expect(getSavedEditorOverlaySelection()).toEqual({ from: 40, to: 55 });
    expect(action).toHaveBeenCalled();
  });

  it("does not seed an empty bookmark before toolbar actions when overlay panel is closed", () => {
    clearEditorOverlaySelection();
    setEditorFormatOverlayPanelOpen(false);
    const editor = mockEditor({ from: 3, to: 3 });

    syncEditorOverlaySelectionBeforeToolbarCommand(editor as never);

    expect(getSavedEditorOverlaySelection()).toBeNull();
  });

  it("returns saved overlay anchor while toolbar overlay context is open", () => {
    clearEditorOverlaySelection();
    const editor = mockEditor({ from: 1, to: 2 });
    captureEditorOverlaySelection(editor as never);
    editor.state.selection = { from: 0, to: 0 };

    runToolbarActionWithOverlaySelection(editor as never, true, () => {
      expect(getOverlayToolbarAnchorPos(editor as never)).toBe(1);
    });
  });

  it("refreshes bookmark from a live non-empty range before toolbar commands", () => {
    clearEditorOverlaySelection();
    const editor = mockEditor({ from: 1, to: 2 });
    captureEditorOverlaySelection(editor as never);

    editor.state.selection = { from: 30, to: 45 };
    syncEditorOverlaySelectionBeforeToolbarCommand(editor as never);

    expect(getSavedEditorOverlaySelection()).toEqual({ from: 30, to: 45 });
  });

  it("keeps a non-empty bookmark when the editor selection collapsed on blur", () => {
    clearEditorOverlaySelection();
    const editor = mockEditor({ from: 10, to: 25 });
    captureEditorOverlaySelection(editor as never);

    editor.state.selection = { from: 0, to: 0 };
    syncEditorOverlaySelectionBeforeToolbarCommand(editor as never);

    expect(getSavedEditorOverlaySelection()).toEqual({ from: 10, to: 25 });
  });

  it("syncs before overlay toolbar actions run", () => {
    clearEditorOverlaySelection();
    const editor = mockEditor({ from: 1, to: 2 });
    captureEditorOverlaySelection(editor as never);
    editor.state.selection = { from: 40, to: 55 };
    const action = vi.fn();

    runToolbarActionWithOverlaySelection(editor as never, true, action);

    expect(getSavedEditorOverlaySelection()).toEqual({ from: 40, to: 55 });
    expect(action).toHaveBeenCalled();
  });

  it("clamps restored selection to the current document size", () => {
    clearEditorOverlaySelection();
    const editor = mockEditor({ from: 90, to: 120 }, 100);
    captureEditorOverlaySelection(editor as never);

    restoreEditorOverlaySelection(editor as never);
    expect(editor.commands.setTextSelection).toHaveBeenCalledWith({
      from: 90,
      to: 100,
    });
  });
});
