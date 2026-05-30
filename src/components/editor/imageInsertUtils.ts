import type { EditorState, Transaction } from "@tiptap/pm/state";
import i18n from "@/i18n";
import { useUIStore } from "@/store/uiStore";
import {
  loadImageDimensions,
  readImageFileAsDataUrl,
  validateImageSize,
} from "./imageEmbedUtils";
import {
  buildBlockImageInsertAttrs,
  getSelectedBlockImagePos,
  type BlockImageInsertAttrs,
} from "./imageResizeUtils";

type ImageInsertEditorView = {
  state: EditorState;
  dispatch: (tr: Transaction) => void;
};

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
  view: ImageInsertEditorView;
};

/** Resolve the document position of an image node matching `src` after insert. */
export function resolveInsertedImagePos(
  state: EditorState,
  src: string,
  hintPos?: number,
): number | null {
  const selectedPos = getSelectedBlockImagePos(state);
  if (selectedPos !== null) {
    const node = state.doc.nodeAt(selectedPos);
    if (node?.type.name === "image" && node.attrs.src === src) {
      return selectedPos;
    }
  }

  const candidates = new Set<number>();
  if (typeof hintPos === "number") {
    candidates.add(hintPos);
  }
  candidates.add(state.selection.from);
  candidates.add(state.selection.from - 1);

  for (const pos of candidates) {
    if (pos < 0 || pos > state.doc.content.size) continue;
    const node = state.doc.nodeAt(pos);
    if (node?.type.name === "image" && node.attrs.src === src) {
      return pos;
    }
  }

  return null;
}

/** After insert, decode dimensions off the critical path and apply min height if needed. */
export function applyDeferredBlockImageMinHeight(
  view: ImageInsertEditorView,
  imagePos: number,
  src: string,
): void {
  void loadImageDimensions(src).then((dims) => {
    const insertAttrs = buildBlockImageInsertAttrs(src, dims?.height);
    if (insertAttrs.height === undefined) {
      return;
    }

    const node = view.state.doc.nodeAt(imagePos);
    if (!node || node.type.name !== "image" || node.attrs.src !== src) {
      return;
    }
    if (node.attrs.height === insertAttrs.height) {
      return;
    }

    const tr = view.state.tr.setNodeMarkup(imagePos, undefined, {
      ...node.attrs,
      height: insertAttrs.height,
    });
    view.dispatch(tr);
  });
}

async function insertBlockImageFromFile(
  editor: ImageInsertEditor,
  file: File,
  insert: (src: string) => boolean,
  hintPos?: number,
): Promise<boolean> {
  const src = await readImageFileAsDataUrl(file);
  if (!src) {
    return false;
  }

  if (!insert(src)) {
    return false;
  }

  const imagePos = resolveInsertedImagePos(editor.view.state, src, hintPos);
  if (imagePos !== null) {
    applyDeferredBlockImageMinHeight(editor.view, imagePos, src);
  }

  return true;
}

export async function insertImageFromFileAtCursor(
  editor: ImageInsertEditor,
  file: File,
): Promise<boolean> {
  if (!validateImageSize(file.size)) {
    useUIStore.getState().showToast(i18n.t("editor.image.tooLarge"), "error");
    return false;
  }

  return insertBlockImageFromFile(editor, file, (src) =>
    editor.chain().focus().setImage({ src }).run(),
  );
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

  return insertBlockImageFromFile(
    editor,
    file,
    (src) =>
      editor
        .chain()
        .focus()
        .insertContentAt(pos, { type: "image", attrs: { src } })
        .run(),
    pos,
  );
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
