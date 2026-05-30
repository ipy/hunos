import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyDeferredBlockImageMinHeight,
  insertImageFromFileAtCursor,
  insertImageFromFileAtPosition,
  resolveInsertedImagePos,
} from "./imageInsertUtils";
import { MAX_IMAGE_BYTES, TINY_PASTE_FILE_BYTES } from "./imageEmbedUtils";
import { MIN_BLOCK_IMAGE_HEIGHT } from "./imageResizeUtils";
import type { BlockImageInsertAttrs } from "./imageResizeUtils";

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

const testSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { content: "inline*", group: "block" },
    image: {
      inline: false,
      group: "block",
      attrs: {
        src: {},
        height: { default: null },
        dataBlockImageFloor: { default: null },
      },
      parseDOM: [{ tag: "img[src]" }],
      toDOM(node) {
        return ["img", node.attrs];
      },
    },
    text: { group: "inline" },
  },
});

function createStateWithImage(
  src: string,
  height: number | null = null,
  dataBlockImageFloor: boolean | null = null,
) {
  const image = testSchema.nodes.image.create({
    src,
    height,
    dataBlockImageFloor,
  });
  const doc = testSchema.nodes.doc.create(null, [image]);
  return EditorState.create({ schema: testSchema, doc });
}

function createMockEditor(state?: EditorState) {
  let currentState =
    state ??
    EditorState.create({
      schema: testSchema,
      doc: testSchema.nodes.doc.create(null, [
        testSchema.nodes.paragraph.create(),
      ]),
    });

  let pendingImageAttrs: BlockImageInsertAttrs | null = null;

  const chain = {
    focus: vi.fn().mockReturnThis(),
    setImage: vi.fn((attrs: BlockImageInsertAttrs) => {
      pendingImageAttrs = attrs;
      return chain;
    }),
    insertContentAt: vi.fn(
      (
        _pos: number,
        content: { type: string; attrs: BlockImageInsertAttrs },
      ) => {
        pendingImageAttrs = content.attrs;
        return chain;
      },
    ),
    run: vi.fn(() => {
      if (pendingImageAttrs) {
        const image = testSchema.nodes.image.create(pendingImageAttrs);
        const { tr } = currentState;
        tr.replaceWith(0, currentState.doc.content.size, image);
        currentState = currentState.apply(tr);
        pendingImageAttrs = null;
      }
      return true;
    }),
  };

  const dispatch = vi.fn((tr) => {
    currentState = currentState.apply(tr);
  });

  return {
    chain: vi.fn(() => chain),
    view: {
      get state() {
        return currentState;
      },
      dispatch,
    },
    _chain: chain,
    _dispatch: dispatch,
    setState(next: EditorState) {
      currentState = next;
    },
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

  it("inserts on data URL without awaiting dimension decode", async () => {
    let resolveDims!: (value: { width: number; height: number }) => void;
    loadImageDimensions.mockReturnValue(
      new Promise((resolve) => {
        resolveDims = resolve;
      }),
    );

    const editor = createMockEditor();
    const file = makePngFile(TINY_PASTE_FILE_BYTES + 512);

    const insertPromise = insertImageFromFileAtCursor(editor, file);
    await Promise.resolve();

    expect(showToast).not.toHaveBeenCalled();
    expect(readImageFileAsDataUrl).toHaveBeenCalledWith(file);
    expect(editor._chain.setImage).toHaveBeenCalledWith({
      src: "data:image/png;base64,abc",
    });

    resolveDims({ width: 800, height: 600 });
    await insertPromise;

    expect(loadImageDimensions).toHaveBeenCalledWith(
      "data:image/png;base64,abc",
    );
    expect(editor._dispatch).not.toHaveBeenCalled();
  });

  it("defers min height for tiny images after insert", async () => {
    loadImageDimensions.mockResolvedValue({ width: 2, height: 2 });

    const src = "data:image/png;base64,tiny";
    readImageFileAsDataUrl.mockResolvedValue(src);
    const editor = createMockEditor();
    const file = makePngFile(32);

    await expect(insertImageFromFileAtCursor(editor, file)).resolves.toBe(true);

    expect(editor._chain.setImage).toHaveBeenCalledWith({
      src,
      dataBlockImageFloor: true,
    });
    await Promise.resolve();
    expect(loadImageDimensions).toHaveBeenCalledWith(src);
    await Promise.resolve();
    expect(editor._dispatch).toHaveBeenCalled();
    const node = editor.view.state.doc.firstChild;
    expect(node?.type.name).toBe("image");
    expect(node?.attrs.height).toBe(MIN_BLOCK_IMAGE_HEIGHT);
    expect(node?.attrs.dataBlockImageFloor).toBeNull();
  });

  it("does not set floor attr for large files on insert", async () => {
    loadImageDimensions.mockResolvedValue({ width: 800, height: 600 });
    readImageFileAsDataUrl.mockResolvedValue("data:image/png;base64,large");
    const editor = createMockEditor();
    const file = makePngFile(TINY_PASTE_FILE_BYTES + 1);

    await expect(insertImageFromFileAtCursor(editor, file)).resolves.toBe(true);

    expect(editor._chain.setImage).toHaveBeenCalledWith({
      src: "data:image/png;base64,large",
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(editor.view.state.doc.firstChild?.attrs.height).toBeNull();
    expect(
      editor.view.state.doc.firstChild?.attrs.dataBlockImageFloor,
    ).toBeNull();
  });
});

describe("resolveInsertedImagePos", () => {
  it("finds image at hint position", () => {
    const src = "data:image/png;base64,x";
    const state = createStateWithImage(src);
    expect(resolveInsertedImagePos(state, src, 0)).toBe(0);
  });
});

describe("applyDeferredBlockImageMinHeight", () => {
  beforeEach(() => {
    loadImageDimensions.mockReset();
  });

  it("sets min height when intrinsic height is tiny", async () => {
    const src = "data:image/png;base64,tiny";
    loadImageDimensions.mockResolvedValue({ width: 2, height: 2 });
    const state = createStateWithImage(src, null, true);
    const dispatch = vi.fn((tr) => {
      editorState = editorState.apply(tr);
    });
    let editorState = state;

    applyDeferredBlockImageMinHeight(
      {
        get state() {
          return editorState;
        },
        dispatch,
      },
      0,
      src,
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(dispatch).toHaveBeenCalled();
    const node = editorState.doc.nodeAt(0);
    expect(node?.attrs.height).toBe(MIN_BLOCK_IMAGE_HEIGHT);
    expect(node?.attrs.dataBlockImageFloor).toBeNull();
  });

  it("clears floor attr for large intrinsic images", async () => {
    const src = "data:image/png;base64,large";
    loadImageDimensions.mockResolvedValue({ width: 800, height: 600 });
    const state = createStateWithImage(src, null, true);
    const dispatch = vi.fn((tr) => {
      editorState = editorState.apply(tr);
    });
    let editorState = state;

    applyDeferredBlockImageMinHeight(
      {
        get state() {
          return editorState;
        },
        dispatch,
      },
      0,
      src,
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(dispatch).toHaveBeenCalled();
    const node = editorState.doc.nodeAt(0);
    expect(node?.attrs.height).toBeNull();
    expect(node?.attrs.dataBlockImageFloor).toBeNull();
  });

  it("skips update when node is missing", async () => {
    const src = "data:image/png;base64,tiny";
    loadImageDimensions.mockResolvedValue({ width: 2, height: 2 });
    const state = createStateWithImage("data:image/png;base64,other");
    const dispatch = vi.fn();

    applyDeferredBlockImageMinHeight({ state, dispatch }, 0, src);

    await Promise.resolve();
    await Promise.resolve();

    expect(dispatch).not.toHaveBeenCalled();
  });
});

describe("insertImageFromFileAtPosition", () => {
  beforeEach(() => {
    showToast.mockReset();
    readImageFileAsDataUrl.mockReset();
    loadImageDimensions.mockReset();
    readImageFileAsDataUrl.mockResolvedValue("data:image/png;base64,tiny");
    loadImageDimensions.mockResolvedValue({ width: 2, height: 2 });
  });

  it("inserts with floor attr for tiny files at the given position", async () => {
    const editor = createMockEditor();
    const file = makePngFile(32);

    await expect(
      insertImageFromFileAtPosition(editor, file, 0),
    ).resolves.toBe(true);

    expect(editor._chain.insertContentAt).toHaveBeenCalledWith(0, {
      type: "image",
      attrs: {
        src: "data:image/png;base64,tiny",
        dataBlockImageFloor: true,
      },
    });
  });
});

describe("insertBlockImageFromFile resolve miss", () => {
  beforeEach(() => {
    readImageFileAsDataUrl.mockReset();
    loadImageDimensions.mockReset();
    readImageFileAsDataUrl.mockResolvedValue("data:image/png;base64,tiny");
    loadImageDimensions.mockResolvedValue({ width: 2, height: 2 });
  });

  it("skips deferred min height when the inserted image cannot be resolved", async () => {
    const editor = createMockEditor();
    editor._chain.run.mockImplementation(() => true);

    const file = makePngFile(32);
    await insertImageFromFileAtCursor(editor, file);

    expect(loadImageDimensions).not.toHaveBeenCalled();
    expect(editor._dispatch).not.toHaveBeenCalled();
  });
});
