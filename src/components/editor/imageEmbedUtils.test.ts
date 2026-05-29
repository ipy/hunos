import { describe, expect, it } from "vitest";
import {
  getImageFileFromClipboard,
  getImageFilesFromDataTransfer,
  hasImageInDataTransfer,
  isImageFile,
  isPlaygroundSampleImageSrc,
  LEGACY_PLAYGROUND_SAMPLE_IMAGE_SRC,
  MAX_IMAGE_BYTES,
  PLAYGROUND_SAMPLE_IMAGE_HEIGHT,
  PLAYGROUND_SAMPLE_IMAGE_SRC,
  PLAYGROUND_SAMPLE_IMAGE_TESTID,
  validateImageSize,
} from "./imageEmbedUtils";

function makePngFile(size = 64, name = "test.png"): File {
  const bytes = new Uint8Array(size);
  return new File([bytes], name, { type: "image/png" });
}

describe("playground sample image constants", () => {
  it("uses a visible PNG data URL with stable test id and height", () => {
    expect(PLAYGROUND_SAMPLE_IMAGE_SRC).toMatch(/^data:image\/png;base64,/);
    expect(PLAYGROUND_SAMPLE_IMAGE_SRC).not.toBe(
      LEGACY_PLAYGROUND_SAMPLE_IMAGE_SRC,
    );
    expect(PLAYGROUND_SAMPLE_IMAGE_SRC.length).toBeGreaterThan(200);
    expect(PLAYGROUND_SAMPLE_IMAGE_TESTID).toBe("playground-sample-image");
    expect(PLAYGROUND_SAMPLE_IMAGE_HEIGHT).toBe(120);
  });

  it("recognizes legacy and current playground sample sources", () => {
    expect(isPlaygroundSampleImageSrc(PLAYGROUND_SAMPLE_IMAGE_SRC)).toBe(true);
    expect(isPlaygroundSampleImageSrc(LEGACY_PLAYGROUND_SAMPLE_IMAGE_SRC)).toBe(
      true,
    );
    expect(isPlaygroundSampleImageSrc("data:image/png;base64,other")).toBe(
      false,
    );
  });
});

describe("isImageFile", () => {
  it("accepts image MIME types", () => {
    expect(isImageFile(makePngFile())).toBe(true);
    expect(isImageFile(new File([], "photo.jpg", { type: "image/jpeg" }))).toBe(
      true,
    );
  });

  it("rejects non-image files", () => {
    expect(
      isImageFile(new File([], "doc.pdf", { type: "application/pdf" })),
    ).toBe(false);
  });
});

describe("validateImageSize", () => {
  it("accepts files within the limit", () => {
    expect(validateImageSize(1024)).toBe(true);
    expect(validateImageSize(MAX_IMAGE_BYTES)).toBe(true);
  });

  it("rejects empty or oversized files", () => {
    expect(validateImageSize(0)).toBe(false);
    expect(validateImageSize(MAX_IMAGE_BYTES + 1)).toBe(false);
  });
});

describe("getImageFileFromClipboard", () => {
  it("returns the first image file from clipboard files", () => {
    const clipboard = {
      files: [new File([], "notes.txt", { type: "text/plain" }), makePngFile()],
      items: [],
    } as unknown as DataTransfer;

    expect(getImageFileFromClipboard(clipboard)?.name).toBe("test.png");
  });

  it("returns image from clipboard items when files are empty", () => {
    const png = makePngFile();
    const clipboard = {
      files: [] as unknown as FileList,
      items: [
        {
          kind: "file",
          type: "image/png",
          getAsFile: () => png,
        },
      ],
    } as unknown as DataTransfer;

    expect(getImageFileFromClipboard(clipboard)).toBe(png);
  });

  it("returns null when no image is present", () => {
    const clipboard = {
      files: [new File([], "notes.txt", { type: "text/plain" })],
      items: [],
    } as unknown as DataTransfer;

    expect(getImageFileFromClipboard(clipboard)).toBeNull();
  });
});

describe("getImageFilesFromDataTransfer", () => {
  it("collects image files from a drop payload", () => {
    const dt = {
      files: [
        makePngFile(),
        new File([], "notes.txt", { type: "text/plain" }),
        new File([], "photo.jpg", { type: "image/jpeg" }),
      ],
    } as unknown as DataTransfer;

    const files = getImageFilesFromDataTransfer(dt);
    expect(files).toHaveLength(2);
    expect(files.every(isImageFile)).toBe(true);
  });
});

describe("hasImageInDataTransfer", () => {
  it("detects image items before drop", () => {
    const dt = {
      files: [makePngFile()],
      items: [],
    } as unknown as DataTransfer;

    expect(hasImageInDataTransfer(dt)).toBe(true);
  });

  it("returns false for text-only payloads", () => {
    const dt = {
      files: [new File([], "notes.txt", { type: "text/plain" })],
      items: [],
    } as unknown as DataTransfer;

    expect(hasImageInDataTransfer(dt)).toBe(false);
  });
});
