import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertImageFromFileAtCursor } from "./imageInsertUtils";
import { MAX_IMAGE_BYTES } from "./imageEmbedUtils";

const showToast = vi.fn();
const readImageFileAsDataUrl = vi.fn();

vi.mock("@/store/uiStore", () => ({
  useUIStore: {
    getState: () => ({ showToast }),
  },
}));

vi.mock("@/i18n", () => ({
  default: { t: (key: string) => key },
}));

vi.mock("./imageEmbedUtils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./imageEmbedUtils")>();
  return {
    ...actual,
    readImageFileAsDataUrl: (
      ...args: Parameters<typeof readImageFileAsDataUrl>
    ) => readImageFileAsDataUrl(...args),
  };
});

function makePngFile(size = 64): File {
  return new File([new Uint8Array(size)], "test.png", { type: "image/png" });
}

function createMockEditor() {
  const chain = {
    focus: vi.fn().mockReturnThis(),
    setImage: vi.fn().mockReturnThis(),
    run: vi.fn(() => true),
  };

  return {
    chain: vi.fn(() => chain),
    _chain: chain,
  };
}

describe("insertImageFromFileAtCursor", () => {
  beforeEach(() => {
    showToast.mockReset();
    readImageFileAsDataUrl.mockReset();
    readImageFileAsDataUrl.mockResolvedValue("data:image/png;base64,abc");
  });

  it("rejects oversized files with an error toast", async () => {
    const editor = createMockEditor();
    const file = makePngFile(MAX_IMAGE_BYTES + 1);

    await expect(insertImageFromFileAtCursor(editor, file)).resolves.toBe(
      false,
    );

    expect(showToast).toHaveBeenCalledWith("editor.image.tooLarge", "error");
    expect(readImageFileAsDataUrl).not.toHaveBeenCalled();
    expect(editor._chain.setImage).not.toHaveBeenCalled();
  });

  it("inserts valid image files", async () => {
    const editor = createMockEditor();
    const file = makePngFile(1024);

    await expect(insertImageFromFileAtCursor(editor, file)).resolves.toBe(true);

    expect(showToast).not.toHaveBeenCalled();
    expect(readImageFileAsDataUrl).toHaveBeenCalledWith(file);
    expect(editor._chain.setImage).toHaveBeenCalledWith({
      src: "data:image/png;base64,abc",
    });
  });
});
