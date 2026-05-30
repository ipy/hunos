import { describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import {
  applyQueuedPlaygroundRestoreWhenEditorReady,
  createPlaygroundRestoreSession,
  finalizePlaygroundRestoreInEditor,
  shouldStashAutosaveOnEffectCleanup,
} from "./playgroundRestoreEditorSync";

vi.mock("@/components/editor/resetEditorHistory", () => ({
  resetEditorHistory: vi.fn(),
}));

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
 * begin session → store update → stash guard → explicit finalize (or queue).
 */
function simulateEditorScreenRestoreFlow(options: {
  editor: Editor | null;
  restoredContent: string;
}) {
  const session = createPlaygroundRestoreSession();

  session.begin();
  expect(shouldStashAutosaveOnEffectCleanup(session.isActive())).toBe(false);

  finalizePlaygroundRestoreInEditor({
    session,
    editor: options.editor,
    restoredContent: options.restoredContent,
  });

  return session;
}

describe("EditorScreen playground restore ordering", () => {
  it("restore → store update → stash guard → explicit finalize when editor is ready", () => {
    const { editor } = createMockEditor();

    const session = simulateEditorScreenRestoreFlow({
      editor,
      restoredContent,
    });

    expect(session.isActive()).toBe(false);
    expect(shouldStashAutosaveOnEffectCleanup(session.isActive())).toBe(true);
  });

  it("restore → store update → stash guard → queue until editor mounts", () => {
    const session = simulateEditorScreenRestoreFlow({
      editor: null,
      restoredContent,
    });

    expect(session.isActive()).toBe(true);
    expect(session.hasQueuedContent()).toBe(true);
    expect(shouldStashAutosaveOnEffectCleanup(session.isActive())).toBe(false);

    const { editor } = createMockEditor();
    expect(
      applyQueuedPlaygroundRestoreWhenEditorReady({ session, editor }),
    ).toBe(true);

    expect(session.isActive()).toBe(false);
    expect(shouldStashAutosaveOnEffectCleanup(session.isActive())).toBe(true);
  });
});
