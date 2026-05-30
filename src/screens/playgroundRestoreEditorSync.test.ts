import { describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import {
  applyPlaygroundRestoreContentToEditor,
  applyQueuedPlaygroundRestoreWhenEditorReady,
  createPlaygroundRestoreSession,
  finalizePlaygroundRestoreInEditor,
  shouldEndPlaygroundRestoreSession,
  shouldStashAutosaveOnEffectCleanup,
} from "./playgroundRestoreEditorSync";

vi.mock("@/components/editor/resetEditorHistory", () => ({
  resetEditorHistory: vi.fn(),
}));

const restoredContent = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "seed" }] }],
});

const pollutedContent = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "RestorePollutionMarker" }],
    },
  ],
});

const contentMatches = (editor: string, stored: string) => editor === stored;

describe("shouldStashAutosaveOnEffectCleanup", () => {
  it("skips stashing while in-session playground restore is active", () => {
    expect(shouldStashAutosaveOnEffectCleanup(true)).toBe(false);
  });

  it("allows stashing during normal editor lifecycle", () => {
    expect(shouldStashAutosaveOnEffectCleanup(false)).toBe(true);
  });
});

describe("shouldEndPlaygroundRestoreSession", () => {
  it("does not end before the editor reflects restored content", () => {
    expect(
      shouldEndPlaygroundRestoreSession({
        isRestoringPlayground: true,
        hasNoteContent: true,
        editorContentJson: pollutedContent,
        restoredContent,
        editorContentMatchesStoredJson: contentMatches,
      }),
    ).toBe(false);
  });

  it("ends after the editor matches restored store content", () => {
    expect(
      shouldEndPlaygroundRestoreSession({
        isRestoringPlayground: true,
        hasNoteContent: true,
        editorContentJson: restoredContent,
        restoredContent,
        editorContentMatchesStoredJson: contentMatches,
      }),
    ).toBe(true);
  });

  it("ends immediately when restore failed to produce content", () => {
    expect(
      shouldEndPlaygroundRestoreSession({
        isRestoringPlayground: true,
        hasNoteContent: false,
        editorContentJson: pollutedContent,
        restoredContent,
        editorContentMatchesStoredJson: contentMatches,
      }),
    ).toBe(true);
  });
});

describe("createPlaygroundRestoreSession", () => {
  it("tracks restore lifecycle until end", () => {
    const session = createPlaygroundRestoreSession();
    expect(session.isActive()).toBe(false);

    session.begin();
    expect(session.isActive()).toBe(true);

    session.end();
    expect(session.isActive()).toBe(false);
  });
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
  const editor = {
    chain: () => chain,
    view: { updateState: vi.fn() },
  } as unknown as Editor;
  return { editor, chain, run };
}

describe("applyPlaygroundRestoreContentToEditor", () => {
  it("forces setContent with addToHistory false for restored JSON", () => {
    const { editor, chain, run } = createMockEditor();
    expect(applyPlaygroundRestoreContentToEditor(editor, restoredContent)).toBe(
      true,
    );
    expect(chain.setMeta).toHaveBeenCalledWith("addToHistory", false);
    expect(chain.setContent).toHaveBeenCalledWith(
      JSON.parse(restoredContent),
      false,
    );
    expect(run).toHaveBeenCalled();
  });

  it("returns false for invalid JSON without mutating the editor", () => {
    const { editor, chain, run } = createMockEditor();
    expect(applyPlaygroundRestoreContentToEditor(editor, "{bad json")).toBe(
      false,
    );
    expect(chain.setContent).not.toHaveBeenCalled();
    expect(chain.clearContent).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });
});

describe("finalizePlaygroundRestoreInEditor", () => {
  it("ends session after explicit apply without waiting for onUpdate match", () => {
    const session = createPlaygroundRestoreSession();
    session.begin();
    const { editor } = createMockEditor();

    finalizePlaygroundRestoreInEditor({
      session,
      editor,
      restoredContent,
    });

    expect(session.isActive()).toBe(false);
    expect(
      shouldEndPlaygroundRestoreSession({
        isRestoringPlayground: session.isActive(),
        hasNoteContent: true,
        editorContentJson: pollutedContent,
        restoredContent,
        editorContentMatchesStoredJson: contentMatches,
      }),
    ).toBe(false);
  });

  it("keeps session active when editor is not ready so queued apply can finish", () => {
    const session = createPlaygroundRestoreSession();
    session.begin();

    finalizePlaygroundRestoreInEditor({
      session,
      editor: null,
      restoredContent,
    });

    expect(session.isActive()).toBe(true);
    expect(session.hasQueuedContent()).toBe(true);
  });

  it("keeps session active when apply fails so pollution is not silently dropped", () => {
    const session = createPlaygroundRestoreSession();
    session.begin();
    const { editor } = createMockEditor();

    finalizePlaygroundRestoreInEditor({
      session,
      editor,
      restoredContent: "{bad json",
    });

    expect(session.isActive()).toBe(true);
  });

  it("ends immediately when restore produced no content", () => {
    const session = createPlaygroundRestoreSession();
    session.begin();

    finalizePlaygroundRestoreInEditor({
      session,
      editor: null,
      restoredContent: "",
    });

    expect(session.isActive()).toBe(false);
  });
});

describe("applyQueuedPlaygroundRestoreWhenEditorReady", () => {
  it("applies queued content and ends session once the editor mounts", () => {
    const session = createPlaygroundRestoreSession();
    session.begin();
    finalizePlaygroundRestoreInEditor({
      session,
      editor: null,
      restoredContent,
    });
    expect(session.isActive()).toBe(true);

    const { editor } = createMockEditor();
    expect(
      applyQueuedPlaygroundRestoreWhenEditorReady({ session, editor }),
    ).toBe(true);
    expect(session.isActive()).toBe(false);
    expect(session.hasQueuedContent()).toBe(false);
  });

  it("does nothing when no content is queued", () => {
    const session = createPlaygroundRestoreSession();
    const { editor } = createMockEditor();
    expect(
      applyQueuedPlaygroundRestoreWhenEditorReady({ session, editor }),
    ).toBe(false);
  });
});

describe("playground restore stash race", () => {
  it("blocks effect cleanup stash while restore session is active", () => {
    expect(shouldStashAutosaveOnEffectCleanup(true)).toBe(false);
  });

  it("re-enables cleanup stash only after session ends", () => {
    const session = createPlaygroundRestoreSession();
    session.begin();
    expect(shouldStashAutosaveOnEffectCleanup(session.isActive())).toBe(false);
    session.end();
    expect(shouldStashAutosaveOnEffectCleanup(session.isActive())).toBe(true);
  });
});
