import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const flushEditorAutosaveResult = vi.fn();

vi.mock("@/store/editorAutosaveRegistry", () => ({
  flushEditorAutosaveResult: () => flushEditorAutosaveResult(),
}));

const saveNoteTitle = vi.fn();
const saveNoteContent = vi.fn();

vi.mock("@/store/noteStore", () => ({
  useNoteStore: {
    getState: () => ({
      saveNoteTitle,
      saveNoteContent,
    }),
  },
}));

import {
  clearUnloadBackup,
  flushForDocumentHide,
  flushForPageUnload,
  peekUnloadBackup,
  persistUnloadDraftSync,
  registerUnloadDraftCollector,
  resetLifecycleUnloadForTests,
  takeUnloadBackup,
  UNLOAD_BACKUP_KEY,
  writeUnloadBackupSync,
} from "./lifecycleUnload";

describe("lifecycleUnload", () => {
  const session = new Map<string, string>();

  beforeEach(() => {
    flushEditorAutosaveResult.mockReset();
    flushEditorAutosaveResult.mockResolvedValue({
      content: '{"type":"doc"}',
      persisted: true,
    });
    saveNoteTitle.mockReset();
    saveNoteContent.mockReset();
    resetLifecycleUnloadForTests();
    session.clear();

    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => session.get(key) ?? null,
      setItem: (key: string, value: string) => {
        session.set(key, value);
      },
      removeItem: (key: string) => {
        session.delete(key);
      },
    });
  });

  afterEach(() => {
    resetLifecycleUnloadForTests();
    vi.unstubAllGlobals();
  });

  it("writes sync backup before unload flush completes", async () => {
    let resolveFlush!: (value: { content: string; persisted: boolean }) => void;
    flushEditorAutosaveResult.mockReturnValue(
      new Promise((resolve) => {
        resolveFlush = resolve;
      }),
    );

    registerUnloadDraftCollector(() => ({
      noteId: "note-1",
      title: "TitleUnload2",
      content: '{"type":"doc","text":"phrase"}',
      savedAt: 0,
    }));

    const pending = flushForPageUnload();
    expect(peekUnloadBackup()).toEqual({
      noteId: "note-1",
      title: "TitleUnload2",
      content: '{"type":"doc","text":"phrase"}',
      savedAt: expect.any(Number),
    });

    resolveFlush({
      content: '{"type":"doc","text":"phrase"}',
      persisted: true,
    });
    const result = await pending;
    expect(result?.persisted).toBe(true);
    expect(peekUnloadBackup()).toBeNull();
  });

  it("awaited unload flush completes before handler returns in tests", async () => {
    const order: string[] = [];
    flushEditorAutosaveResult.mockImplementation(async () => {
      order.push("flush-start");
      await Promise.resolve();
      order.push("flush-end");
      return { content: "{}", persisted: true };
    });

    await flushForPageUnload();
    expect(order).toEqual(["flush-start", "flush-end"]);
  });

  it("dedupes rapid hide and unload into one flush", async () => {
    let resolveFlush!: (value: {
      content: string | null;
      persisted: boolean;
    }) => void;
    flushEditorAutosaveResult.mockReturnValue(
      new Promise((resolve) => {
        resolveFlush = resolve;
      }),
    );

    const hidePromise = flushForDocumentHide();
    const unloadPromise = flushForPageUnload();

    resolveFlush({ content: null, persisted: true });
    await Promise.all([hidePromise, unloadPromise]);

    expect(flushEditorAutosaveResult).toHaveBeenCalledOnce();
  });

  it("skips unload flush when pagehide is persisted (bfcache)", async () => {
    const result = await flushForPageUnload({
      persisted: true,
    } as PageTransitionEvent);
    expect(result).toBeNull();
    expect(flushEditorAutosaveResult).not.toHaveBeenCalled();
  });

  it("keeps backup when flush reports save failure", async () => {
    registerUnloadDraftCollector(() => ({
      noteId: "note-1",
      content: '{"pending":true}',
      savedAt: 0,
    }));
    flushEditorAutosaveResult.mockResolvedValue({
      content: '{"pending":true}',
      persisted: false,
    });

    await flushForPageUnload();
    expect(peekUnloadBackup()?.content).toBe('{"pending":true}');
  });

  it("recoverPendingUnloadBackup applies title and content then clears backup", async () => {
    writeUnloadBackupSync({
      noteId: "note-1",
      title: "TitleUnload2",
      content: '{"type":"doc"}',
      savedAt: Date.now(),
    });

    const { recoverPendingUnloadBackup } = await import("./lifecycleUnload");
    await recoverPendingUnloadBackup();

    expect(saveNoteTitle).toHaveBeenCalledWith("note-1", "TitleUnload2");
    expect(saveNoteContent).toHaveBeenCalledWith("note-1", '{"type":"doc"}');
    expect(takeUnloadBackup()).toBeNull();
  });

  it("keeps backup when playground flush reports save failure", async () => {
    registerUnloadDraftCollector(() => ({
      noteId: "pg-1",
      title: "格式试炼场",
      content: '{"type":"doc","text":"UnloadPhrase2"}',
      savedAt: 0,
    }));
    flushEditorAutosaveResult.mockResolvedValue({
      content: '{"type":"doc","text":"UnloadPhrase2"}',
      persisted: false,
    });

    await flushForPageUnload();
    expect(peekUnloadBackup()?.content).toBe(
      '{"type":"doc","text":"UnloadPhrase2"}',
    );
  });

  it("clears backup when playground flush persists to storage", async () => {
    registerUnloadDraftCollector(() => ({
      noteId: "pg-1",
      title: "格式试炼场",
      content: '{"type":"doc","text":"UnloadPhrase3"}',
      savedAt: 0,
    }));
    flushEditorAutosaveResult.mockResolvedValue({
      content: '{"type":"doc","text":"UnloadPhrase3"}',
      persisted: true,
    });

    await flushForPageUnload();
    expect(peekUnloadBackup()).toBeNull();
  });

  it("uses stable sessionStorage key", () => {
    expect(UNLOAD_BACKUP_KEY).toBe("hunos:unload-backup");
  });

  it("persistUnloadDraftSync writes collector draft without awaiting flush", () => {
    registerUnloadDraftCollector(() => ({
      noteId: "note-1",
      title: "TitleUnload3",
      content: '{"type":"doc","text":"phrase"}',
      savedAt: 0,
    }));

    persistUnloadDraftSync();

    expect(peekUnloadBackup()?.title).toBe("TitleUnload3");
    expect(flushEditorAutosaveResult).not.toHaveBeenCalled();
  });
});
