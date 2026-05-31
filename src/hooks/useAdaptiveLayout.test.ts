import { describe, expect, it, vi, afterEach } from "vitest";
import {
  BREAKPOINTS,
  FLOATING_TOOLBAR_MIN_WIDTH,
  getLayoutMode,
  isFloatingSelectionToolbarVisible,
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

  it("hides floating selection toolbar at mobile widths and on native runtimes", () => {
    vi.stubGlobal("window", {
      innerWidth: BREAKPOINTS.tablet,
      Capacitor: { isNativePlatform: () => true },
    });
    expect(isFloatingSelectionToolbarVisible()).toBe(false);

    vi.stubGlobal("navigator", { userAgent: "ArkWeb" });
    vi.stubGlobal("window", { innerWidth: FLOATING_TOOLBAR_MIN_WIDTH });
    expect(isFloatingSelectionToolbarVisible()).toBe(false);
  });

  it("shows floating selection toolbar on wide desktop web", () => {
    vi.stubGlobal("navigator", { userAgent: "Chrome" });
    vi.stubGlobal("window", {
      innerWidth: FLOATING_TOOLBAR_MIN_WIDTH,
      Capacitor: { isNativePlatform: () => false },
    });
    expect(isFloatingSelectionToolbarVisible()).toBe(true);

    vi.stubGlobal("window", {
      innerWidth: FLOATING_TOOLBAR_MIN_WIDTH - 1,
      Capacitor: { isNativePlatform: () => false },
    });
    expect(isFloatingSelectionToolbarVisible()).toBe(false);
  });
});
