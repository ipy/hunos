import { afterEach, describe, expect, it, vi } from "vitest";
import {
  localeToUrlParam,
  parseLocaleFromUrlParam,
  readLocaleFromUrl,
  resolveBootstrapLocale,
  writeLocaleToUrl,
} from "./localeBootstrap";

function mockBrowser({
  userAgent,
  search,
}: {
  userAgent: string;
  search: string;
}) {
  vi.stubGlobal("navigator", { userAgent });
  vi.stubGlobal("window", { location: { search } });
}

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

describe("resolveBootstrapLocale", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to zh on ArkWeb first launch without URL locale", () => {
    mockBrowser({ userAgent: "Mozilla/5.0 ArkWeb/1.0", search: "" });
    expect(resolveBootstrapLocale("en", false)).toBe("zh");
  });

  it("honors ?lang=en on ArkWeb", () => {
    mockBrowser({
      userAgent: "Mozilla/5.0 ArkWeb/1.0",
      search: "?lang=en",
    });
    expect(resolveBootstrapLocale("zh", false)).toBe("en");
  });

  it("uses stored locale on non-ArkWeb without query", () => {
    mockBrowser({ userAgent: "Mozilla/5.0 Chrome/120.0", search: "" });
    expect(resolveBootstrapLocale("en", false)).toBe("en");
    expect(resolveBootstrapLocale("zh", true)).toBe("zh");
  });

  it("keeps persisted en on ArkWeb when locale was stored", () => {
    mockBrowser({ userAgent: "Mozilla/5.0 ArkWeb/1.0", search: "" });
    expect(resolveBootstrapLocale("en", true)).toBe("en");
  });

  it("honors ?lang=en on web even when stored locale is zh", () => {
    mockBrowser({
      userAgent: "Mozilla/5.0 Chrome/120.0",
      search: "?lang=en",
    });
    expect(resolveBootstrapLocale("zh", true)).toBe("en");
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
