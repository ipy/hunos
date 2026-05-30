import { afterEach, describe, expect, it, vi } from "vitest";
import {
  harmonizeFontFamily,
  resolveCodeFontFamily,
  resolveTextFontFamily,
  TEXT_FONTS,
} from "@/utils/fonts";
import {
  HARMONY_CJK_FALLBACK,
  HARMONY_UI_MONO,
  HARMONY_UI_SANS,
} from "@/utils/platform";

function mockUserAgent(ua: string) {
  vi.stubGlobal("navigator", { userAgent: ua });
}

describe("fonts on HarmonyOS (ArkWeb)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps system sans to HarmonyOS UI stack", () => {
    mockUserAgent("Mozilla/5.0 ArkWeb/1.0");
    expect(resolveTextFontFamily("sans")).toBe(HARMONY_UI_SANS);
  });

  it("appends CJK fallback to bundled Inter stack", () => {
    mockUserAgent("Mozilla/5.0 ArkWeb/1.0");
    expect(resolveTextFontFamily("inter")).toBe(
      `"Inter", ${HARMONY_CJK_FALLBACK}, sans-serif`,
    );
  });

  it("maps system mono code font to HarmonyOS mono stack", () => {
    mockUserAgent("Mozilla/5.0 ArkWeb/1.0");
    expect(resolveCodeFontFamily("mono")).toBe(HARMONY_UI_MONO);
  });

  it("appends CJK fallback to bundled JetBrains Mono stack", () => {
    mockUserAgent("Mozilla/5.0 ArkWeb/1.0");
    expect(resolveCodeFontFamily("jetbrains")).toBe(
      `"JetBrains Mono", ${HARMONY_CJK_FALLBACK}, monospace`,
    );
  });
});

describe("fonts on web", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps web system sans unchanged", () => {
    mockUserAgent("Mozilla/5.0 Macintosh");
    expect(resolveTextFontFamily("sans")).toBe(TEXT_FONTS[0].family);
  });

  it("keeps bundled Inter unchanged", () => {
    mockUserAgent("Mozilla/5.0 Macintosh");
    expect(resolveTextFontFamily("inter")).toBe('"Inter", sans-serif');
  });

  it("harmonizeFontFamily is a no-op off ArkWeb", () => {
    mockUserAgent("Mozilla/5.0 Macintosh");
    expect(harmonizeFontFamily('"Inter", sans-serif')).toBe(
      '"Inter", sans-serif',
    );
  });
});
