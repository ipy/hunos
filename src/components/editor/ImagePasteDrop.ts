import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import {
  getImageFileFromClipboard,
  getImageFilesFromDataTransfer,
  hasImageInDataTransfer,
} from "./imageEmbedUtils";
import {
  insertImageFromFileAtCursor,
  insertImageFromFileAtPosition,
} from "./imageInsertUtils";

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
            void insertImageFromFileAtCursor(editor, imageFile);
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

            void insertImageFromFileAtPosition(editor, files[0], pos);
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
