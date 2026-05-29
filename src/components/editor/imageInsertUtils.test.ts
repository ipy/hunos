import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertImageFromFileAtCursor } from "./imageInsertUtils";
import { MAX_IMAGE_BYTES } from "./imageEmbedUtils";
import { MIN_BLOCK_IMAGE_HEIGHT } from "./imageResizeUtils";

const showToast = vi.fn();
const readImageFileAsDataUrl = vi.fn();
const loadImageDimensions = vi.fn();

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
    loadImageDimensions: (...args: Parameters<typeof loadImageDimensions>) =>
      loadImageDimensions(...args),
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
    loadImageDimensions.mockReset();
    readImageFileAsDataUrl.mockResolvedValue("data:image/png;base64,abc");
    loadImageDimensions.mockResolvedValue({ width: 800, height: 600 });
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

  it("inserts valid image files without height when large enough", async () => {
    const editor = createMockEditor();
    const file = makePngFile(1024);

    await expect(insertImageFromFileAtCursor(editor, file)).resolves.toBe(true);

    expect(showToast).not.toHaveBeenCalled();
    expect(readImageFileAsDataUrl).toHaveBeenCalledWith(file);
    expect(loadImageDimensions).toHaveBeenCalledWith(
      "data:image/png;base64,abc",
    );
    expect(editor._chain.setImage).toHaveBeenCalledWith({
      src: "data:image/png;base64,abc",
    });
  });

  it("inserts tiny images with min block height", async () => {
    const editor = createMockEditor();
    const file = makePngFile(32);
    loadImageDimensions.mockResolvedValue({ width: 2, height: 2 });

    await expect(insertImageFromFileAtCursor(editor, file)).resolves.toBe(true);

    expect(editor._chain.setImage).toHaveBeenCalledWith({
      src: "data:image/png;base64,abc",
      height: MIN_BLOCK_IMAGE_HEIGHT,
    });
  });
});
