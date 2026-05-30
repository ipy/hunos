import { describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import {
  applyPlaygroundRestoreContentToEditor,
  applyQueuedPlaygroundRestoreWhenEditorReady,
  createPlaygroundRestoreSession,
  finalizePlaygroundRestoreInEditor,
  shouldStashAutosaveOnEffectCleanup,
} from "./playgroundRestoreEditorSync";

vi.mock("@/components/editor/resetEditorHistory", () => ({
  resetEditorHistory: vi.fn(),
}));

const noteId = "playground-note-a";
const restoredContent = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "seed" }] }],
});

function createMockEditor() {
  const run = vi.fn();
  const chain = {
    setMeta: vi.fn(function (this: typeof chain) {
      return this;
    }),
    setContent: vi.fn(function (this: typeof chain) {
      return this;
    }),
    clearContent: vi.fn(function (this: typeof chain) {
      return this;
    }),
    run,
  };
  return {
    editor: {
      chain: () => chain,
      view: { updateState: vi.fn() },
    } as unknown as Editor,
    chain,
  };
}

/**
 * Mirrors EditorScreen.handleRestorePlayground ordering:
 * begin session → store update → stash guard → explicit finalize (or queue/fallback).
 */
function simulateEditorScreenRestoreFlow(options: {
  editor: Editor | null;
  restoredContent: string;
  noteId?: string;
  simulateStoreUpdate?: boolean;
}) {
  const session = createPlaygroundRestoreSession();
  const targetNoteId = options.noteId ?? noteId;

  session.begin(targetNoteId);
  expect(shouldStashAutosaveOnEffectCleanup(session.isActive())).toBe(false);

  let storeContent = "";
  if (options.simulateStoreUpdate) {
    storeContent = options.restoredContent;
    expect(storeContent).toBe(options.restoredContent);
  }

  const applied = finalizePlaygroundRestoreInEditor({
    session,
    editor: options.editor,
    restoredContent: options.restoredContent || storeContent,
  });

  return { session, applied, storeContent };
}

describe("EditorScreen playground restore ordering", () => {
  it("restore → store update → stash guard → explicit finalize when editor is ready", () => {
    const { editor } = createMockEditor();

    const { session, applied } = simulateEditorScreenRestoreFlow({
      editor,
      restoredContent,
      simulateStoreUpdate: true,
    });

    expect(applied).toBe(true);
    expect(session.isActive()).toBe(false);
    expect(shouldStashAutosaveOnEffectCleanup(session.isActive())).toBe(true);
  });

  it("restore → store update → stash guard → queue until editor mounts", () => {
    const { session } = simulateEditorScreenRestoreFlow({
      editor: null,
      restoredContent,
      simulateStoreUpdate: true,
    });

    expect(session.isActive()).toBe(true);
    expect(session.hasQueuedContent()).toBe(true);
    expect(shouldStashAutosaveOnEffectCleanup(session.isActive())).toBe(false);

    const { editor } = createMockEditor();
    expect(
      applyQueuedPlaygroundRestoreWhenEditorReady({
        session,
        editor,
        activeNoteId: noteId,
      }),
    ).toBe(true);

    expect(session.isActive()).toBe(false);
    expect(shouldStashAutosaveOnEffectCleanup(session.isActive())).toBe(true);
  });

  it("post-await editor ref: editor attaches after store update and queued flush applies seed", () => {
    const { session } = simulateEditorScreenRestoreFlow({
      editor: null,
      restoredContent,
      simulateStoreUpdate: true,
    });

    expect(session.isActive()).toBe(true);
    expect(session.hasQueuedContent()).toBe(true);

    const { editor } = createMockEditor();
    expect(
      applyQueuedPlaygroundRestoreWhenEditorReady({
        session,
        editor,
        activeNoteId: noteId,
      }),
    ).toBe(true);

    expect(session.isActive()).toBe(false);
  });

  it("apply-false fallback keeps session active for editorSeedContent sync", () => {
    const { editor } = createMockEditor();
    const session = createPlaygroundRestoreSession();
    session.begin(noteId);

    expect(shouldStashAutosaveOnEffectCleanup(session.isActive())).toBe(false);

    const applied = finalizePlaygroundRestoreInEditor({
      session,
      editor,
      restoredContent: "{bad json",
    });

    expect(applied).toBe(false);
    expect(session.isActive()).toBe(true);
    expect(shouldStashAutosaveOnEffectCleanup(session.isActive())).toBe(false);

    const editorSeedContent = restoredContent;
    expect(
      applyPlaygroundRestoreContentToEditor(editor, editorSeedContent),
    ).toBe(true);
    session.end();
    expect(session.isActive()).toBe(false);
  });

  it("note switch cancels in-flight restore before queued JSON reaches another editor", () => {
    const session = createPlaygroundRestoreSession();
    session.begin("note-a");
    session.queueContent(restoredContent);

    expect(session.cancelIfNoteChanged("note-b")).toBe(true);
    expect(session.isActive()).toBe(false);

    const { editor, chain } = createMockEditor();
    expect(
      applyQueuedPlaygroundRestoreWhenEditorReady({
        session,
        editor,
        activeNoteId: "note-b",
      }),
    ).toBe(false);
    expect(chain.setContent).not.toHaveBeenCalled();
  });
});
