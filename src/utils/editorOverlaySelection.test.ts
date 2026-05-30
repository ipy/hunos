import { describe, expect, it, vi } from "vitest";
import {
  captureEditorOverlaySelection,
  clearEditorOverlaySelection,
  focusEditorWithOverlaySelection,
  getSavedEditorOverlaySelection,
  restoreEditorOverlaySelection,
  runToolbarActionWithOverlaySelection,
  runToolbarChain,
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
