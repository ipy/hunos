import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { BREAKPOINTS } from "@/hooks/useAdaptiveLayout";
import { useUIStore } from "./uiStore";

describe("uiStore focus mode", () => {
  beforeEach(() => {
    useUIStore.setState({ focusMode: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    useUIStore.setState({ focusMode: false });
  });

  it("ignores enabling focus mode on mobile", () => {
    vi.stubGlobal("window", { innerWidth: BREAKPOINTS.tablet - 1 });

    useUIStore.getState().setFocusMode(true);
    expect(useUIStore.getState().focusMode).toBe(false);

    useUIStore.getState().toggleFocusMode();
    expect(useUIStore.getState().focusMode).toBe(false);
  });

  it("allows focus mode on tablet and desktop", () => {
    vi.stubGlobal("window", { innerWidth: BREAKPOINTS.tablet });

    useUIStore.getState().toggleFocusMode();
    expect(useUIStore.getState().focusMode).toBe(true);

    useUIStore.getState().setFocusMode(false);
    expect(useUIStore.getState().focusMode).toBe(false);
  });

  it("always allows disabling focus mode on mobile", () => {
    vi.stubGlobal("window", { innerWidth: BREAKPOINTS.tablet - 1 });
    useUIStore.setState({ focusMode: true });

    useUIStore.getState().setFocusMode(false);
    expect(useUIStore.getState().focusMode).toBe(false);
  });
});
