import { describe, expect, it, vi, afterEach } from "vitest";
import {
  BREAKPOINTS,
  FLOATING_TOOLBAR_MIN_WIDTH,
  isFloatingSelectionToolbarVisible,
} from "@/hooks/useAdaptiveLayout";

describe("SelectionBubbleMenu policy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hides floating toolbar at mobile widths and shows at desktop AC width", () => {
    vi.stubGlobal("navigator", { userAgent: "Chrome" });
    vi.stubGlobal("window", {
      innerWidth: BREAKPOINTS.tablet - 1,
      Capacitor: { isNativePlatform: () => false },
    });
    expect(isFloatingSelectionToolbarVisible()).toBe(false);

    vi.stubGlobal("window", {
      innerWidth: FLOATING_TOOLBAR_MIN_WIDTH,
      Capacitor: { isNativePlatform: () => false },
    });
    expect(isFloatingSelectionToolbarVisible()).toBe(true);
  });
});
