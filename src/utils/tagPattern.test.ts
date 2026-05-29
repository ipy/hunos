import { describe, expect, it } from "vitest";
import { getTagDisplayName, isValidTagName } from "./tagPattern";

describe("isValidTagName", () => {
  it("accepts simple and nested tags", () => {
    expect(isValidTagName("welcome")).toBe(true);
    expect(isValidTagName("format-test")).toBe(true);
    expect(isValidTagName("parent/child")).toBe(true);
    expect(isValidTagName("中文")).toBe(true);
  });

  it("rejects empty and whitespace-only names", () => {
    expect(isValidTagName("")).toBe(false);
    expect(isValidTagName("   ")).toBe(false);
  });

  it("rejects trailing slash and empty path segments", () => {
    expect(isValidTagName("foo/")).toBe(false);
    expect(isValidTagName("foo//bar")).toBe(false);
    expect(isValidTagName("/foo")).toBe(false);
  });

  it("rejects names with empty display segment", () => {
    expect(getTagDisplayName("foo/")).toBe("");
    expect(isValidTagName("foo/")).toBe(false);
  });
});
