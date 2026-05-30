import { describe, expect, it, beforeEach } from "vitest";
import { useUIStore } from "@/store/uiStore";

/**
 * Mirrors EditorScreen focus-new-note-title effect: consume signal before rAF focus.
 */
function simulateEditorScreenFocusNewNoteTitleEffect(layout: "mobile" | "desktop") {
  const { focusNewNoteTitleSignal, clearFocusNewNoteTitle } =
    useUIStore.getState();
  if (focusNewNoteTitleSignal === 0) return { focused: false };
  if (layout !== "mobile") return { focused: false };
  clearFocusNewNoteTitle();
  return { focused: true };
}

describe("EditorScreen focusNewNoteTitle one-shot", () => {
  beforeEach(() => {
    useUIStore.setState({ focusNewNoteTitleSignal: 0 });
  });

  it("focuses title once on mobile FAB create then clears signal", () => {
    useUIStore.getState().requestFocusNewNoteTitle();

    const firstOpen = simulateEditorScreenFocusNewNoteTitleEffect("mobile");
    expect(firstOpen.focused).toBe(true);
    expect(useUIStore.getState().focusNewNoteTitleSignal).toBe(0);
  });

  it("does not refocus title when opening another note after FAB create", () => {
    useUIStore.getState().requestFocusNewNoteTitle();
    simulateEditorScreenFocusNewNoteTitleEffect("mobile");

    const switchNote = simulateEditorScreenFocusNewNoteTitleEffect("mobile");
    expect(switchNote.focused).toBe(false);
  });

  it("does not consume signal on desktop", () => {
    useUIStore.getState().requestFocusNewNoteTitle();

    const desktop = simulateEditorScreenFocusNewNoteTitleEffect("desktop");
    expect(desktop.focused).toBe(false);
    expect(useUIStore.getState().focusNewNoteTitleSignal).toBe(1);
  });
});
