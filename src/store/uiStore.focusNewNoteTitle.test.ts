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
});
