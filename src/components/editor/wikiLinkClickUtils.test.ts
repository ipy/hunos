import { describe, expect, it } from "vitest";
import {
  isPosInsideWikiLinkSpan,
  shouldNavigateWikiLinkClick,
} from "./wikiLinkClickUtils";

const linkSpan = { start: 10, end: 28 };

describe("isPosInsideWikiLinkSpan", () => {
  it.each([
    [9, false],
    [10, true],
    [15, true],
    [28, true],
    [29, false],
  ])("pos %i inside [10, 28] is %s", (pos, expected) => {
    expect(isPosInsideWikiLinkSpan(pos, linkSpan)).toBe(expected);
  });
});

describe("shouldNavigateWikiLinkClick", () => {
  it("navigates when caret was outside the link before click", () => {
    expect(shouldNavigateWikiLinkClick(5, linkSpan)).toBe(true);
    expect(shouldNavigateWikiLinkClick(29, linkSpan)).toBe(true);
  });

  it("does not navigate when caret was already inside the link", () => {
    expect(shouldNavigateWikiLinkClick(10, linkSpan)).toBe(false);
    expect(shouldNavigateWikiLinkClick(20, linkSpan)).toBe(false);
    expect(shouldNavigateWikiLinkClick(28, linkSpan)).toBe(false);
  });
});
