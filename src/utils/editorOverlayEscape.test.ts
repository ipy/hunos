import { describe, expect, it, vi } from "vitest";
import { dismissEditorOverlayOnEscape } from "./editorOverlayEscape";

describe("dismissEditorOverlayOnEscape", () => {
  it("closes the actions menu on Escape before stats or focus mode", () => {
    const closeActions = vi.fn();
    const closeStats = vi.fn();

    expect(
      dismissEditorOverlayOnEscape(
        "Escape",
        { showActions: true, showStats: true },
        { closeActions, closeStats },
      ),
    ).toBe(true);
    expect(closeActions).toHaveBeenCalledOnce();
    expect(closeStats).not.toHaveBeenCalled();
  });

  it("closes the stats panel when only stats is open", () => {
    const closeActions = vi.fn();
    const closeStats = vi.fn();

    expect(
      dismissEditorOverlayOnEscape(
        "Escape",
        { showActions: false, showStats: true },
        { closeActions, closeStats },
      ),
    ).toBe(true);
    expect(closeStats).toHaveBeenCalledOnce();
    expect(closeActions).not.toHaveBeenCalled();
  });

  it("ignores non-Escape keys and when no overlay is open", () => {
    const closeActions = vi.fn();
    const closeStats = vi.fn();
    const handlers = { closeActions, closeStats };

    expect(
      dismissEditorOverlayOnEscape(
        "Enter",
        { showActions: true, showStats: false },
        handlers,
      ),
    ).toBe(false);
    expect(
      dismissEditorOverlayOnEscape(
        "Escape",
        { showActions: false, showStats: false },
        handlers,
      ),
    ).toBe(false);
    expect(closeActions).not.toHaveBeenCalled();
    expect(closeStats).not.toHaveBeenCalled();
  });
});
