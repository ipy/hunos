import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import i18n from "@/i18n";
import { useUIStore } from "@/store/uiStore";
import {
  getImageFileFromClipboard,
  getImageFilesFromDataTransfer,
  hasImageInDataTransfer,
  readImageFileAsDataUrl,
  validateImageSize,
} from "./imageEmbedUtils";

async function insertImageAtCursor(
  editor: {
    chain: () => {
      focus: () => {
        setImage: (attrs: { src: string }) => { run: () => boolean };
      };
    };
  },
  file: File,
): Promise<boolean> {
  if (!validateImageSize(file.size)) {
    useUIStore.getState().showToast(i18n.t("editor.image.tooLarge"), "error");
    return false;
  }

  const src = await readImageFileAsDataUrl(file);
  if (!src) {
    return false;
  }

  editor.chain().focus().setImage({ src }).run();
  return true;
}

async function insertImageAtPosition(
  editor: {
    chain: () => {
      focus: () => {
        insertContentAt: (
          pos: number,
          content: { type: string; attrs: { src: string } },
        ) => { run: () => boolean };
      };
    };
  },
  file: File,
  pos: number,
): Promise<boolean> {
  if (!validateImageSize(file.size)) {
    useUIStore.getState().showToast(i18n.t("editor.image.tooLarge"), "error");
    return false;
  }

  const src = await readImageFileAsDataUrl(file);
  if (!src) {
    return false;
  }

  editor
    .chain()
    .focus()
    .insertContentAt(pos, { type: "image", attrs: { src } })
    .run();
  return true;
}

export const ImagePasteDrop = Extension.create({
  name: "imagePasteDrop",
  priority: 1000,

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const clipboard = event.clipboardData;
            if (!clipboard) {
              return false;
            }

            const imageFile = getImageFileFromClipboard(clipboard);
            if (!imageFile) {
              return false;
            }

            event.preventDefault();
            void insertImageAtCursor(editor, imageFile);
            return true;
          },
          handleDrop: (view, event, _slice, moved) => {
            if (moved) {
              return false;
            }

            const dt = event.dataTransfer;
            if (!dt) {
              return false;
            }

            const files = getImageFilesFromDataTransfer(dt);
            if (files.length === 0) {
              return false;
            }

            event.preventDefault();

            const coords = { left: event.clientX, top: event.clientY };
            const pos =
              view.posAtCoords(coords)?.pos ?? view.state.selection.from;

            void insertImageAtPosition(editor, files[0], pos);
            return true;
          },
          handleDOMEvents: {
            dragover: (_view, event) => {
              const dt = event.dataTransfer;
              if (dt && hasImageInDataTransfer(dt)) {
                event.preventDefault();
                dt.dropEffect = "copy";
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});
