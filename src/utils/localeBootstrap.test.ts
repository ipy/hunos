import { describe, expect, it } from "vitest";
import { parseLocaleFromUrlParam, readLocaleFromUrl } from "./localeBootstrap";

describe("parseLocaleFromUrlParam", () => {
  it("maps zh-CN and zh variants to zh", () => {
    expect(parseLocaleFromUrlParam("zh-CN")).toBe("zh");
    expect(parseLocaleFromUrlParam("zh-TW")).toBe("zh");
    expect(parseLocaleFromUrlParam("zh")).toBe("zh");
  });

  it("maps en and es prefixes", () => {
    expect(parseLocaleFromUrlParam("en-US")).toBe("en");
    expect(parseLocaleFromUrlParam("es-ES")).toBe("es");
  });

  it("returns null for missing or unknown values", () => {
    expect(parseLocaleFromUrlParam(null)).toBeNull();
    expect(parseLocaleFromUrlParam("")).toBeNull();
    expect(parseLocaleFromUrlParam("fr")).toBeNull();
  });
});

describe("readLocaleFromUrl", () => {
  it("returns null in non-browser environments", () => {
    expect(readLocaleFromUrl()).toBeNull();
  });
});
