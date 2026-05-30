import { describe, expect, it, beforeEach } from "vitest";
import { useUIStore } from "./uiStore";

describe("uiStore focusNewNoteTitle", () => {
  beforeEach(() => {
    useUIStore.setState({ focusNewNoteTitleSignal: 0 });
  });

  it("increments focusNewNoteTitleSignal on request", () => {
    expect(useUIStore.getState().focusNewNoteTitleSignal).toBe(0);
    useUIStore.getState().requestFocusNewNoteTitle();
    expect(useUIStore.getState().focusNewNoteTitleSignal).toBe(1);
    useUIStore.getState().requestFocusNewNoteTitle();
    expect(useUIStore.getState().focusNewNoteTitleSignal).toBe(2);
  });

  it("clears focusNewNoteTitleSignal so subsequent editor opens do not refocus title", () => {
    useUIStore.getState().requestFocusNewNoteTitle();
    expect(useUIStore.getState().focusNewNoteTitleSignal).toBe(1);

    useUIStore.getState().clearFocusNewNoteTitle();
    expect(useUIStore.getState().focusNewNoteTitleSignal).toBe(0);

    // Simulates opening another note after FAB create consumed the one-shot signal.
    expect(useUIStore.getState().focusNewNoteTitleSignal).toBe(0);
  });
});
