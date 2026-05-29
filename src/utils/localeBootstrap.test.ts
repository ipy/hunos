import { describe, expect, it, vi } from "vitest";
import {
  localeToUrlParam,
  parseLocaleFromUrlParam,
  readLocaleFromUrl,
  writeLocaleToUrl,
} from "./localeBootstrap";

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

describe("localeToUrlParam", () => {
  it("maps app locales to canonical query values", () => {
    expect(localeToUrlParam("en")).toBe("en");
    expect(localeToUrlParam("zh")).toBe("zh-CN");
    expect(localeToUrlParam("es")).toBe("es");
  });
});

describe("writeLocaleToUrl", () => {
  it("updates lang via history.replaceState", () => {
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: {
        href: "http://127.0.0.1:5175/?lang=zh-CN",
        search: "?lang=zh-CN",
      },
      history: { replaceState },
    });

    writeLocaleToUrl("en");

    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "http://127.0.0.1:5175/?lang=en",
    );
    vi.unstubAllGlobals();
  });
});
