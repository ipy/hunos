import { describe, expect, it } from "vitest";
import {
  doesRangeIntersectWikiLinkInBlock,
  findCompleteWikiLinksInBlock,
  findWikiLinkSuggestionMatchInBlock,
  isComposePrefixOfExistingLink,
  isOffsetInsideCompleteWikiLink,
} from "./wikiLinkSuggestionUtils";

describe("findCompleteWikiLinksInBlock", () => {
  it("finds a single closed link", () => {
    expect(findCompleteWikiLinksInBlock("[[double]]")).toEqual([
      { start: 0, end: 10, title: "double" },
    ]);
  });

  it("finds multiple links in one block", () => {
    expect(findCompleteWikiLinksInBlock("see [[a]] and [[b]]")).toEqual([
      { start: 4, end: 9, title: "a" },
      { start: 14, end: 19, title: "b" },
    ]);
  });
});

describe("isOffsetInsideCompleteWikiLink", () => {
  const text = "[[double]]";

  it.each([
    [0, true],
    [2, true],
    [5, true],
    [8, true],
    [10, true],
  ])("offset %i inside inclusive [[double]]", (offset, expected) => {
    expect(isOffsetInsideCompleteWikiLink(text, offset)).toBe(expected);
  });

  it("offset outside link is false", () => {
    expect(isOffsetInsideCompleteWikiLink("prefix [[double]] suffix", 0)).toBe(
      false,
    );
    expect(isOffsetInsideCompleteWikiLink("prefix [[double]] suffix", 3)).toBe(
      false,
    );
    expect(isOffsetInsideCompleteWikiLink("prefix [[double]] suffix", 18)).toBe(
      false,
    );
  });
});

describe("findWikiLinkSuggestionMatchInBlock", () => {
  const doubleLink = "[[double]]";

  it.each([2, 3, 5, 8, 9])(
    "returns null when caret at offset %i inside [[double]]",
    (offset) => {
      expect(findWikiLinkSuggestionMatchInBlock(doubleLink, offset)).toBeNull();
    },
  );

  it("allows compose outside an existing link", () => {
    const text = "[[double]] [[dou";
    const match = findWikiLinkSuggestionMatchInBlock(text, text.length);
    expect(match).toEqual({
      range: { from: 11, to: 16 },
      query: "dou",
    });
  });

  it("allows new link at end of paragraph", () => {
    const text = "hello ";
    const match = findWikiLinkSuggestionMatchInBlock(
      `${text}[[dou`,
      text.length + 5,
    );
    expect(match).toEqual({
      range: { from: text.length, to: text.length + 5 },
      query: "dou",
    });
  });

  it("allows prefix match outside links", () => {
    const match = findWikiLinkSuggestionMatchInBlock("[[Wel", 5);
    expect(match).toEqual({
      range: { from: 0, to: 5 },
      query: "Wel",
    });
  });

  it("allows compose after user removes closing brackets", () => {
    const text = "[[double";
    const match = findWikiLinkSuggestionMatchInBlock(text, text.length);
    expect(match).toEqual({
      range: { from: 0, to: text.length },
      query: "double",
    });
  });
});

describe("isComposePrefixOfExistingLink", () => {
  it("detects false compose inside closed link", () => {
    expect(isComposePrefixOfExistingLink("[[double]]", 0, 5)).toBe(true);
    expect(isComposePrefixOfExistingLink("[[double]]", 0, 10)).toBe(false);
  });
});

describe("doesRangeIntersectWikiLinkInBlock", () => {
  it("detects partial ranges inside a closed link", () => {
    expect(doesRangeIntersectWikiLinkInBlock("[[double]]", 0, 5)).toBe(true);
    expect(doesRangeIntersectWikiLinkInBlock("[[double]]", 5, 10)).toBe(true);
  });

  it("does not intersect ranges outside links", () => {
    expect(doesRangeIntersectWikiLinkInBlock("hello [[double]]", 0, 5)).toBe(
      false,
    );
  });
});
