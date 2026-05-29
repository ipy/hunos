export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Tiny 1×1 PNG used in Format Playground seed content. */
export const PLAYGROUND_SAMPLE_IMAGE_SRC =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

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
