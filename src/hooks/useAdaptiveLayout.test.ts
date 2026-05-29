import { describe, expect, it, vi, afterEach } from "vitest";
import {
  BREAKPOINTS,
  getLayoutMode,
  isMobileViewport,
} from "./useAdaptiveLayout";

describe("useAdaptiveLayout helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("classifies viewport widths at shared breakpoints", () => {
    expect(getLayoutMode(BREAKPOINTS.tablet - 1)).toBe("mobile");
    expect(getLayoutMode(BREAKPOINTS.tablet)).toBe("tablet");
    expect(getLayoutMode(BREAKPOINTS.desktop - 1)).toBe("tablet");
    expect(getLayoutMode(BREAKPOINTS.desktop)).toBe("desktop");
  });

  it("detects mobile viewport from window width", () => {
    vi.stubGlobal("window", { innerWidth: BREAKPOINTS.tablet - 1 });
    expect(isMobileViewport()).toBe(true);

    vi.stubGlobal("window", { innerWidth: BREAKPOINTS.tablet });
    expect(isMobileViewport()).toBe(false);
  });
});
