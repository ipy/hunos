import { describe, expect, it, vi } from "vitest";
import {
  computeSuggestionMenuPosition,
  isSuggestionAnchorRectValid,
  isUserTextEditKeyDown,
} from "./editorSuggestionMenu";

function domRect(
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect {
  const DOMRectCtor = globalThis.DOMRect;
  if (typeof DOMRectCtor === "function") {
    return new DOMRectCtor(left, top, width, height);
  }
  return { left, top, width, height, right: left + width, bottom: top + height } as DOMRect;
}

describe("isSuggestionAnchorRectValid", () => {
  it("rejects zero-size origin anchor from failed coordsAtPos", () => {
    expect(isSuggestionAnchorRectValid(domRect(0, 0, 0, 0))).toBe(false);
  });

  it("accepts a caret anchor inside the viewport", () => {
    vi.stubGlobal("window", { innerWidth: 390, innerHeight: 844 });
    expect(isSuggestionAnchorRectValid(domRect(24, 120, 1, 20))).toBe(true);
    vi.unstubAllGlobals();
  });

  it("rejects anchors fully outside the viewport", () => {
    vi.stubGlobal("window", { innerWidth: 390, innerHeight: 844 });
    expect(isSuggestionAnchorRectValid(domRect(-50, -50, 1, 10))).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe("computeSuggestionMenuPosition", () => {
  it("respects mobile top inset when flipping above the caret", () => {
    vi.stubGlobal("window", { innerWidth: 390, innerHeight: 844 });
    const anchor = domRect(24, 800, 1, 20);
    const menu = domRect(0, 0, 220, 200);
    const { top } = computeSuggestionMenuPosition(anchor, menu, {
      topInset: 60,
    });
    expect(top).toBeGreaterThanOrEqual(60);
    vi.unstubAllGlobals();
  });
});

describe("isUserTextEditKeyDown", () => {
  it("accepts printable characters and delete keys", () => {
    expect(
      isUserTextEditKeyDown({ key: "#", length: 1 } as KeyboardEvent),
    ).toBe(true);
    expect(
      isUserTextEditKeyDown({ key: "Backspace", length: 9 } as KeyboardEvent),
    ).toBe(true);
  });

  it("rejects navigation and modified keys", () => {
    expect(
      isUserTextEditKeyDown({ key: "ArrowDown", length: 9 } as KeyboardEvent),
    ).toBe(false);
    expect(
      isUserTextEditKeyDown({
        key: "a",
        length: 1,
        ctrlKey: true,
      } as KeyboardEvent),
    ).toBe(false);
  });
});
