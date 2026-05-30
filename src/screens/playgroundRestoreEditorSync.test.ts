import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/react";
import {
  applyPlaygroundRestoreContentToEditor,
  applyQueuedPlaygroundRestoreWhenEditorReady,
  createPlaygroundRestoreSession,
  finalizePlaygroundRestoreInEditor,
  handlePlaygroundRestoreApplyResult,
  shouldEndPlaygroundRestoreSession,
  shouldStashAutosaveOnEffectCleanup,
} from "./playgroundRestoreEditorSync";

vi.mock("@/components/editor/resetEditorHistory", () => ({
  resetEditorHistory: vi.fn(),
}));

const restoredContent = JSON.stringify({
  type: "doc",
  attrs: {
    playgroundContentVersion: 22,
    playgroundContentLocale: "zh",
  },
  content: [{ type: "paragraph", content: [{ type: "text", text: "seed" }] }],
});

const pollutedContent = JSON.stringify({
  type: "doc",
  attrs: {
    playgroundContentVersion: 22,
    playgroundContentLocale: "zh",
  },
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "RestorePollutionMarker" }],
    },
  ],
});

describe("shouldEndPlaygroundRestoreSession", () => {
  it("does not end before the editor reflects restored content", () => {
    expect(
      shouldEndPlaygroundRestoreSession({
        isRestoringPlayground: true,
        hasNoteContent: true,
        editorContentJson: pollutedContent,
        restoredContent,
        fallbackLocale: "zh",
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
        fallbackLocale: "zh",
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
        fallbackLocale: "zh",
      }),
    ).toBe(true);
  });
});

describe("createPlaygroundRestoreSession", () => {
  it("tracks restore lifecycle until end", () => {
    const session = createPlaygroundRestoreSession();
    expect(session.isActive()).toBe(false);

    session.begin("note-a");
    expect(session.isActive()).toBe(true);
    expect(session.getNoteId()).toBe("note-a");

    session.end();
    expect(session.isActive()).toBe(false);
    expect(session.getNoteId()).toBeNull();
  });

  it("cancels restore when active note changes (note-scoped session)", () => {
    const session = createPlaygroundRestoreSession();
    session.begin("note-a");
    session.queueContent(restoredContent);

    expect(session.cancelIfNoteChanged("note-b")).toBe(true);
    expect(session.isActive()).toBe(false);
    expect(session.hasQueuedContent()).toBe(false);
  });

  it("does not cancel when active note matches restore target", () => {
    const session = createPlaygroundRestoreSession();
    session.begin("note-a");

    expect(session.cancelIfNoteChanged("note-a")).toBe(false);
    expect(session.isActive()).toBe(true);
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
  it("ends session after explicit apply so restore chip hides immediately", () => {
    const session = createPlaygroundRestoreSession();
    session.begin("note-a");
    const { editor } = createMockEditor();

    expect(
      finalizePlaygroundRestoreInEditor({
        session,
        editor,
        restoredContent,
      }),
    ).toBe(true);

    expect(session.isActive()).toBe(false);
  });

  it("EditorScreen restore handler always bumps restoreEditorSyncTick", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/screens/EditorScreen.tsx"),
      "utf8",
    );
    expect(source).toMatch(
      /finalizePlaygroundRestoreInEditor\([\s\S]*?\);\s*if \(!applied && restoredContent\)/,
    );
    expect(source).toMatch(
      /setRestoreEditorSyncTick\(\(tick\) => tick \+ 1\);\s*setTitleValue/,
    );
  });

  it("keeps session active when editor is not ready so queued apply can finish", () => {
    const session = createPlaygroundRestoreSession();
    session.begin("note-a");

    expect(
      finalizePlaygroundRestoreInEditor({
        session,
        editor: null,
        restoredContent,
      }),
    ).toBe(false);

    expect(session.isActive()).toBe(true);
    expect(session.hasQueuedContent()).toBe(true);
  });

  it("keeps session active when apply fails so pollution is not silently dropped", () => {
    const session = createPlaygroundRestoreSession();
    session.begin("note-a");
    const { editor } = createMockEditor();

    expect(
      finalizePlaygroundRestoreInEditor({
        session,
        editor,
        restoredContent: "{bad json",
      }),
    ).toBe(false);

    expect(session.isActive()).toBe(true);
  });

  it("ends immediately when restore produced no content", () => {
    const session = createPlaygroundRestoreSession();
    session.begin("note-a");

    expect(
      finalizePlaygroundRestoreInEditor({
        session,
        editor: null,
        restoredContent: "",
      }),
    ).toBe(true);

    expect(session.isActive()).toBe(false);
  });
});

describe("applyQueuedPlaygroundRestoreWhenEditorReady", () => {
  it("applies queued content and ends session for immediate chip hide", () => {
    const session = createPlaygroundRestoreSession();
    session.begin("note-a");
    finalizePlaygroundRestoreInEditor({
      session,
      editor: null,
      restoredContent,
    });
    expect(session.isActive()).toBe(true);

    const { editor } = createMockEditor();
    expect(
      applyQueuedPlaygroundRestoreWhenEditorReady({
        session,
        editor,
        activeNoteId: "note-a",
      }),
    ).toBe(true);
    expect(session.isActive()).toBe(false);
    expect(session.hasQueuedContent()).toBe(false);
  });

  it("re-queues content when apply fails so session is not stuck with empty queue", () => {
    const session = createPlaygroundRestoreSession();
    session.begin("note-a");
    session.queueContent("{bad json");

    const { editor } = createMockEditor();
    expect(
      applyQueuedPlaygroundRestoreWhenEditorReady({
        session,
        editor,
        activeNoteId: "note-a",
      }),
    ).toBe(false);

    expect(session.isActive()).toBe(true);
    expect(session.hasQueuedContent()).toBe(true);
  });

  it("does not apply queued content after note switch cancels session", () => {
    const session = createPlaygroundRestoreSession();
    session.begin("note-a");
    session.queueContent(restoredContent);

    const { editor, chain } = createMockEditor();
    expect(
      applyQueuedPlaygroundRestoreWhenEditorReady({
        session,
        editor,
        activeNoteId: "note-b",
      }),
    ).toBe(false);

    expect(session.isActive()).toBe(false);
    expect(session.hasQueuedContent()).toBe(false);
    expect(chain.setContent).not.toHaveBeenCalled();
  });

  it("does nothing when no content is queued", () => {
    const session = createPlaygroundRestoreSession();
    const { editor } = createMockEditor();
    expect(
      applyQueuedPlaygroundRestoreWhenEditorReady({ session, editor }),
    ).toBe(false);
  });
});

describe("handlePlaygroundRestoreApplyResult", () => {
  it("returns true when apply succeeds without ending session early", () => {
    const session = createPlaygroundRestoreSession();
    session.begin("note-a");

    expect(
      handlePlaygroundRestoreApplyResult({
        applied: true,
        content: restoredContent,
        session,
      }),
    ).toBe(true);
    expect(session.isActive()).toBe(true);
  });

  it("re-queues content when apply fails", () => {
    const session = createPlaygroundRestoreSession();
    session.begin("note-a");

    expect(
      handlePlaygroundRestoreApplyResult({
        applied: false,
        content: restoredContent,
        session,
      }),
    ).toBe(false);
    expect(session.isActive()).toBe(true);
    expect(session.hasQueuedContent()).toBe(true);
  });
});

describe("playground restore stash race", () => {
  it("blocks effect cleanup stash while restore session is active", () => {
    expect(shouldStashAutosaveOnEffectCleanup(true)).toBe(false);
  });

  it("re-enables cleanup stash only after session ends", () => {
    const session = createPlaygroundRestoreSession();
    session.begin("note-a");
    expect(shouldStashAutosaveOnEffectCleanup(session.isActive())).toBe(false);
    session.end();
    expect(shouldStashAutosaveOnEffectCleanup(session.isActive())).toBe(true);
  });
});
