import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const flushEditorAutosaveResult = vi.fn();

vi.mock("@/store/editorAutosaveRegistry", () => ({
  flushEditorAutosaveResult: () => flushEditorAutosaveResult(),
}));

const saveNoteTitle = vi.fn();
const saveNoteContent = vi.fn();
const noteStorageGet = vi.fn();

vi.mock("@/storage/noteStorage", () => ({
  noteStorage: {
    get: (id: string) => noteStorageGet(id),
  },
}));

vi.mock("@/store/noteStore", () => ({
  useNoteStore: {
    getState: () => ({
      saveNoteTitle,
      saveNoteContent,
      notes: useNoteStoreNotes,
    }),
  },
}));

let useNoteStoreNotes: Array<{
  id: string;
  title: string;
  content: string;
  modifiedAt: number;
}> = [];

import { buildPlaygroundContent } from "@/storage/formatPlaygroundNote";
import {
  clearUnloadBackup,
  flushForDocumentHide,
  flushForPageUnload,
  peekUnloadBackup,
  persistUnloadDraftSync,
  recoverPendingUnloadBackup,
  registerUnloadDraftCollector,
  resetLifecycleUnloadForTests,
  takeUnloadBackup,
  UNLOAD_BACKUP_KEY,
  unloadBackupWouldRegressStoredNote,
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
    noteStorageGet.mockReset();
    useNoteStoreNotes = [];
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

  it("coalesces sequential hide and unload after first flush persisted", async () => {
    flushEditorAutosaveResult.mockResolvedValue({
      content: '{"type":"doc","text":"phrase"}',
      persisted: true,
    });

    await flushForDocumentHide();
    await flushForPageUnload();

    expect(flushEditorAutosaveResult).toHaveBeenCalledOnce();
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
    noteStorageGet.mockResolvedValue(undefined);
    writeUnloadBackupSync({
      noteId: "note-1",
      title: "TitleUnload2",
      content: '{"type":"doc"}',
      savedAt: Date.now(),
    });

    await recoverPendingUnloadBackup("en");

    expect(saveNoteTitle).toHaveBeenCalledWith("note-1", "TitleUnload2");
    expect(saveNoteContent).toHaveBeenCalledWith("note-1", '{"type":"doc"}');
    expect(takeUnloadBackup()).toBeNull();
  });

  it("recoverPendingUnloadBackup skips backup older than stored modifiedAt", async () => {
    noteStorageGet.mockResolvedValue({
      id: "pg-1",
      title: "格式试炼场",
      content: JSON.stringify(buildPlaygroundContent("zh")),
      modifiedAt: 5_000,
    });
    writeUnloadBackupSync({
      noteId: "pg-1",
      title: "格式试炼场",
      content: '{"type":"doc","text":"T4-MIXED-stale"}',
      savedAt: 1_000,
    });

    await recoverPendingUnloadBackup("zh");

    expect(saveNoteContent).not.toHaveBeenCalled();
    expect(takeUnloadBackup()).toBeNull();
  });

  it("recoverPendingUnloadBackup skips polluted backup over canonical playground", async () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    noteStorageGet.mockResolvedValue({
      id: "pg-1",
      title: "格式试炼场",
      content: seed,
      modifiedAt: 2_000,
    });
    const polluted = JSON.stringify({
      type: "doc",
      attrs: {
        playgroundContentVersion: 22,
        playgroundContentLocale: "zh",
      },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "T4-MIXED-reload" }],
        },
      ],
    });
    writeUnloadBackupSync({
      noteId: "pg-1",
      title: "格式试炼场",
      content: polluted,
      savedAt: 9_000,
    });

    await recoverPendingUnloadBackup("zh");

    expect(saveNoteContent).not.toHaveBeenCalled();
    expect(unloadBackupWouldRegressStoredNote(
      {
        noteId: "pg-1",
        title: "格式试炼场",
        content: polluted,
        savedAt: 9_000,
      },
      {
        title: "格式试炼场",
        content: seed,
        modifiedAt: 2_000,
      },
      "zh",
    )).toBe(true);
  });

  it("recoverPendingUnloadBackup skips reorder drift backup with unchanged plain text", async () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    const reordered = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          type?: string;
          content?: Array<{ text?: string }>;
        }>;
      }>;
    };
    const listsIndex = reordered.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const bulletList = reordered.content[listsIndex + 1];
    const items = bulletList?.content ?? [];
    if (items.length >= 2) {
      [items[0], items[1]] = [items[1], items[0]];
    }
    const drifted = JSON.stringify(reordered);

    noteStorageGet.mockResolvedValue({
      id: "pg-1",
      title: "格式试炼场",
      content: seed,
      modifiedAt: 2_000,
    });
    writeUnloadBackupSync({
      noteId: "pg-1",
      title: "格式试炼场",
      content: drifted,
      savedAt: 9_000,
    });

    await recoverPendingUnloadBackup("zh");

    expect(saveNoteContent).not.toHaveBeenCalled();
    expect(
      unloadBackupWouldRegressStoredNote(
        {
          noteId: "pg-1",
          title: "格式试炼场",
          content: drifted,
          savedAt: 9_000,
        },
        {
          title: "格式试炼场",
          content: seed,
          modifiedAt: 2_000,
        },
        "zh",
      ),
    ).toBe(true);
  });

  it("persistUnloadDraftSync skips backup that would regress canonical playground in memory", () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    useNoteStoreNotes = [
      {
        id: "pg-1",
        title: "格式试炼场",
        content: seed,
        modifiedAt: Date.now(),
      },
    ];
    registerUnloadDraftCollector(() => ({
      noteId: "pg-1",
      title: "格式试炼场",
      content: JSON.stringify({
        type: "doc",
        attrs: {
          playgroundContentVersion: 22,
          playgroundContentLocale: "zh",
        },
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "T4-MIXED-unmount" }],
          },
        ],
      }),
      savedAt: 0,
    }));

    persistUnloadDraftSync();

    expect(peekUnloadBackup()).toBeNull();
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
