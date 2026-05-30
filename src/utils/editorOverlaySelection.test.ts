import { describe, expect, it, vi } from "vitest";
import {
  captureEditorOverlaySelection,
  clearEditorOverlaySelection,
  getSavedEditorOverlaySelection,
  restoreEditorOverlaySelection,
} from "./editorOverlaySelection";

function mockEditor(selection: { from: number; to: number }, docSize = 100) {
  return {
    isDestroyed: false,
    state: {
      selection,
      doc: { content: { size: docSize } },
    },
    commands: {
      setTextSelection: vi.fn(() => true),
    },
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
