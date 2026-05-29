import i18n from "@/i18n";
import { useUIStore } from "@/store/uiStore";
import {
  loadImageDimensions,
  readImageFileAsDataUrl,
  validateImageSize,
} from "./imageEmbedUtils";
import {
  buildBlockImageInsertAttrs,
  type BlockImageInsertAttrs,
} from "./imageResizeUtils";

type ImageInsertEditor = {
  chain: () => {
    focus: () => {
      setImage: (attrs: BlockImageInsertAttrs) => { run: () => boolean };
      insertContentAt: (
        pos: number,
        content: { type: string; attrs: BlockImageInsertAttrs },
      ) => { run: () => boolean };
    };
  };
};

async function blockImageInsertAttrsFromFile(
  file: File,
): Promise<BlockImageInsertAttrs | null> {
  const src = await readImageFileAsDataUrl(file);
  if (!src) {
    return null;
  }

  const dims = await loadImageDimensions(src);
  return buildBlockImageInsertAttrs(src, dims?.height);
}

export async function insertImageFromFileAtCursor(
  editor: ImageInsertEditor,
  file: File,
): Promise<boolean> {
  if (!validateImageSize(file.size)) {
    useUIStore.getState().showToast(i18n.t("editor.image.tooLarge"), "error");
    return false;
  }

  const attrs = await blockImageInsertAttrsFromFile(file);
  if (!attrs) {
    return false;
  }

  editor.chain().focus().setImage(attrs).run();
  return true;
}

export async function insertImageFromFileAtPosition(
  editor: ImageInsertEditor,
  file: File,
  pos: number,
): Promise<boolean> {
  if (!validateImageSize(file.size)) {
    useUIStore.getState().showToast(i18n.t("editor.image.tooLarge"), "error");
    return false;
  }

  const attrs = await blockImageInsertAttrsFromFile(file);
  if (!attrs) {
    return false;
  }

  editor.chain().focus().insertContentAt(pos, { type: "image", attrs }).run();
  return true;
}

export function pickImageFileFromDialog(options?: {
  capture?: "environment";
}): Promise<File | null> {
  return new Promise((resolve) => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      if (options?.capture) {
        try {
          input.capture = options.capture;
        } catch {
          /* capture not supported */
        }
      }
      input.onchange = () => {
        resolve(input.files?.[0] ?? null);
      };
      input.click();
    } catch {
      resolve(null);
    }
  });
}

export async function insertImageFromToolbarPicker(
  editor: ImageInsertEditor,
  options?: { capture?: "environment" },
): Promise<boolean> {
  const file = await pickImageFileFromDialog(options);
  if (!file) {
    return false;
  }

  return insertImageFromFileAtCursor(editor, file);
}
