import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  applyLinkUrl,
  isValidLinkUrl,
  normalizeLinkUrl,
  prepareLinkEditor,
  toggleMark,
} from "./inlineFormatActions";
import { clearLinkEditorSelection } from "./linkEditorSelection";
import {
  captureEditorOverlaySelection,
  clearEditorOverlaySelection,
} from "@/utils/editorOverlaySelection";

const showToast = vi.fn();

vi.mock("@/store/uiStore", () => ({
  useUIStore: {
    getState: () => ({ showToast }),
  },
}));

vi.mock("@/i18n", () => ({
  default: { t: (key: string) => key },
}));

function createMockEditor(options?: {
  isLink?: boolean;
  href?: string;
  selection?: { from: number; to: number };
}) {
  const selection = options?.selection ?? { from: 0, to: 5 };
  const chain = {
    focus: vi.fn().mockReturnThis(),
    extendMarkRange: vi.fn().mockReturnThis(),
    setTextSelection: vi.fn().mockReturnThis(),
    setLink: vi.fn().mockReturnThis(),
    unsetLink: vi.fn().mockReturnThis(),
    run: vi.fn(() => true),
  };

  return {
    isActive: vi.fn((mark: string) => mark === "link" && !!options?.isLink),
    getAttributes: vi.fn(() => ({ href: options?.href ?? "" })),
    state: {
      selection,
      doc: { content: { size: 100 } },
    },
    commands: {
      setTextSelection: vi.fn(),
    },
    chain: vi.fn(() => chain),
    _chain: chain,
  };
}

describe("link editor helpers", () => {
  beforeEach(() => {
    showToast.mockReset();
    clearLinkEditorSelection();
  });

  it("validates and normalizes URLs", () => {
    expect(isValidLinkUrl("https://example.com")).toBe(true);
    expect(isValidLinkUrl("example.com")).toBe(true);
    expect(isValidLinkUrl("not a url")).toBe(false);
    expect(isValidLinkUrl("not a valid url")).toBe(false);
    expect(isValidLinkUrl("notavalidurl")).toBe(false);
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
    prepareLinkEditor(editor as never);
    expect(editor._chain.extendMarkRange).toHaveBeenCalledWith("link");
    expect(applyLinkUrl(editor as never, "https://b.test")).toBe(true);
    expect(editor._chain.extendMarkRange).toHaveBeenCalledWith("link");
    expect(editor._chain.setLink).toHaveBeenCalledWith({
      href: "https://b.test",
    });
  });

  it("restores captured selection before applying a new link", () => {
    const editor = createMockEditor({ selection: { from: 2, to: 7 } });
    prepareLinkEditor(editor as never);
    expect(applyLinkUrl(editor as never, "https://docs.example.com")).toBe(
      true,
    );
    expect(editor.commands.setTextSelection).toHaveBeenCalledWith({
      from: 2,
      to: 7,
    });
    expect(editor._chain.setLink).toHaveBeenCalledWith({
      href: "https://docs.example.com",
    });
  });
});

describe("toggleMark with overlay selection", () => {
  it("restores saved selection before applying a mark", () => {
    clearEditorOverlaySelection();
    const chain = {
      focus: vi.fn().mockReturnThis(),
      setTextSelection: vi.fn().mockReturnThis(),
      toggleBold: vi.fn().mockReturnThis(),
      run: vi.fn(() => true),
    };
    const editor = {
      isActive: vi.fn(() => false),
      isDestroyed: false,
      state: {
        selection: { empty: false, $from: { start: () => 1, end: () => 5 } },
        doc: { content: { size: 100 } },
      },
      chain: vi.fn(() => chain),
      commands: {
        focus: vi.fn(() => true),
        setTextSelection: vi.fn(() => true),
      },
    };

    captureEditorOverlaySelection({
      state: {
        selection: { from: 42, to: 58 },
        doc: { content: { size: 100 } },
      },
    } as never);

    toggleMark(editor as never, "bold", () =>
      editor.chain().focus().toggleBold().run(),
    );

    expect(chain.setTextSelection).toHaveBeenCalledWith({
      from: 42,
      to: 58,
    });
  });
});
