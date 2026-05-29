import { describe, expect, it } from "vitest";
import { normalizeCodeBlockLanguage } from "./codeBlockLanguage";

describe("normalizeCodeBlockLanguage", () => {
  it("returns null for empty input", () => {
    expect(normalizeCodeBlockLanguage(null)).toBeNull();
    expect(normalizeCodeBlockLanguage(undefined)).toBeNull();
    expect(normalizeCodeBlockLanguage("")).toBeNull();
    expect(normalizeCodeBlockLanguage("   ")).toBeNull();
  });

  it("normalizes common aliases", () => {
    expect(normalizeCodeBlockLanguage("js")).toBe("javascript");
    expect(normalizeCodeBlockLanguage("JS")).toBe("javascript");
    expect(normalizeCodeBlockLanguage("ts")).toBe("typescript");
    expect(normalizeCodeBlockLanguage("sh")).toBe("bash");
    expect(normalizeCodeBlockLanguage("shell")).toBe("bash");
  });

  it("passes through registered language ids", () => {
    expect(normalizeCodeBlockLanguage("javascript")).toBe("javascript");
    expect(normalizeCodeBlockLanguage("json")).toBe("json");
    expect(normalizeCodeBlockLanguage("markdown")).toBe("markdown");
  });
});
