import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  applyLinkUrl,
  isValidLinkUrl,
  normalizeLinkUrl,
} from "./inlineFormatActions";

const showToast = vi.fn();

vi.mock("@/store/uiStore", () => ({
  useUIStore: {
    getState: () => ({ showToast }),
  },
}));

vi.mock("@/i18n", () => ({
  default: { t: (key: string) => key },
}));

function createMockEditor(options?: { isLink?: boolean; href?: string }) {
  const chain = {
    focus: vi.fn().mockReturnThis(),
    extendMarkRange: vi.fn().mockReturnThis(),
    setLink: vi.fn().mockReturnThis(),
    unsetLink: vi.fn().mockReturnThis(),
    run: vi.fn(),
  };

  return {
    isActive: vi.fn((mark: string) => mark === "link" && !!options?.isLink),
    getAttributes: vi.fn(() => ({ href: options?.href ?? "" })),
    chain: vi.fn(() => chain),
    _chain: chain,
  };
}

describe("link editor helpers", () => {
  beforeEach(() => {
    showToast.mockReset();
  });

  it("validates and normalizes URLs", () => {
    expect(isValidLinkUrl("https://example.com")).toBe(true);
    expect(isValidLinkUrl("example.com")).toBe(true);
    expect(isValidLinkUrl("not a url")).toBe(false);
    expect(normalizeLinkUrl("example.com")).toBe("https://example.com");
  });

  it("applies a normalized link to the current selection", () => {
    const editor = createMockEditor();
    expect(applyLinkUrl(editor as never, "example.com")).toBe(true);
    expect(editor._chain.setLink).toHaveBeenCalledWith({
      href: "https://example.com",
    });
  });

  it("rejects invalid URLs with a toast", () => {
    const editor = createMockEditor();
    expect(applyLinkUrl(editor as never, "bad url")).toBe(false);
    expect(showToast).toHaveBeenCalledWith("editor.link.invalidUrl", "error");
    expect(editor._chain.setLink).not.toHaveBeenCalled();
  });

  it("removes an existing link when URL is cleared", () => {
    const editor = createMockEditor({ isLink: true, href: "https://a.test" });
    expect(applyLinkUrl(editor as never, "   ")).toBe(true);
    expect(editor._chain.unsetLink).toHaveBeenCalled();
  });

  it("extends link range when editing an existing link", () => {
    const editor = createMockEditor({ isLink: true, href: "https://a.test" });
    expect(applyLinkUrl(editor as never, "https://b.test")).toBe(true);
    expect(editor._chain.extendMarkRange).toHaveBeenCalledWith("link");
    expect(editor._chain.setLink).toHaveBeenCalledWith({
      href: "https://b.test",
    });
  });
});
