export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Pasted files at or below this size get an immediate 80px visual floor (2×2 PNG ≪; 800×600 ≫). */
export const TINY_PASTE_FILE_BYTES = 1024;

/** Previous 1×1 PNG seed (migrated to {@link PLAYGROUND_SAMPLE_IMAGE_SRC}). */
export const LEGACY_PLAYGROUND_SAMPLE_IMAGE_SRC =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** Visible 32×24 gradient PNG for Format Playground seed content. */
export const PLAYGROUND_SAMPLE_IMAGE_SRC =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAYEAIAAABEobQgAAAAcElEQVRYw+2XUQ3AMAgFWbIP5qI1sZmoyMqrCUZF9IMcAQXvQu4RrrXmHEOwc0s39S86xgGANzpAt4cN0EzljY5xAlAORANk2ICQASRDC7EB+A786vQ7gJY4gwPVQqEAKf4BtsQZNkC/A/wWKgcCZwObU0kyUSALsAAAAABJRU5ErkJggg==";

/** Stable selector for automation on the Format Playground sample image. */
export const PLAYGROUND_SAMPLE_IMAGE_TESTID = "playground-sample-image";

/** Default rendered height for the Format Playground sample image block. */
export const PLAYGROUND_SAMPLE_IMAGE_HEIGHT = 120;

export function isPlaygroundSampleImageSrc(src: unknown): boolean {
  return (
    typeof src === "string" &&
    (src === PLAYGROUND_SAMPLE_IMAGE_SRC ||
      src === LEGACY_PLAYGROUND_SAMPLE_IMAGE_SRC)
  );
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function validateImageSize(size: number): boolean {
  return size > 0 && size <= MAX_IMAGE_BYTES;
}

export function readImageFileAsDataUrl(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!isImageFile(file)) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/** Natural pixel dimensions after the data URL loads in the browser. */
export function loadImageDimensions(
  src: string,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function getImageFileFromClipboard(
  clipboard: DataTransfer,
): File | null {
  if (clipboard.files?.length) {
    for (let i = 0; i < clipboard.files.length; i += 1) {
      const file = clipboard.files[i];
      if (isImageFile(file)) {
        return file;
      }
    }
  }

  if (clipboard.items) {
    for (let i = 0; i < clipboard.items.length; i += 1) {
      const item = clipboard.items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          return file;
        }
      }
    }
  }

  return null;
}

export function getImageFilesFromDataTransfer(dt: DataTransfer): File[] {
  const files: File[] = [];
  if (!dt.files?.length) {
    return files;
  }

  for (let i = 0; i < dt.files.length; i += 1) {
    const file = dt.files[i];
    if (isImageFile(file)) {
      files.push(file);
    }
  }

  return files;
}

export function hasImageInDataTransfer(dt: DataTransfer): boolean {
  if (dt.files?.length) {
    for (let i = 0; i < dt.files.length; i += 1) {
      if (isImageFile(dt.files[i])) {
        return true;
      }
    }
  }

  if (dt.items) {
    for (let i = 0; i < dt.items.length; i += 1) {
      const item = dt.items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        return true;
      }
    }
  }

  return false;
}
