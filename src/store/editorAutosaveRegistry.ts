import { checkpointStorageAfterFlush } from "@/storage/storageCheckpoint";

export type EditorAutosaveFlushResult = {
  content: string | null;
  persisted: boolean;
};

type EditorAutosaveFlush = () => Promise<EditorAutosaveFlushResult>;

export type EditorAutosaveSnapshot = {
  noteId: string;
  content: string;
};

let flushHandler: EditorAutosaveFlush | null = null;
let stashedSnapshot: EditorAutosaveSnapshot | null = null;

export function registerEditorAutosaveFlush(
  handler: EditorAutosaveFlush,
): void {
  flushHandler = handler;
}

export function unregisterEditorAutosaveFlush(
  handler: EditorAutosaveFlush,
): void {
  if (flushHandler === handler) {
    flushHandler = null;
  }
}

/** Retain pending editor JSON across unmount until locale sync or remount restore. */
export function stashEditorAutosaveSnapshot(
  noteId: string,
  content: string,
): void {
  stashedSnapshot = { noteId, content };
}

export function peekStashedEditorAutosave(): EditorAutosaveSnapshot | null {
  return stashedSnapshot;
}

export function takeStashedEditorAutosave(): EditorAutosaveSnapshot | null {
  const snapshot = stashedSnapshot;
  stashedSnapshot = null;
  return snapshot;
}

/** Drop pending stash after locale sync or when noteId no longer matches. */
export function clearStashedEditorAutosave(): void {
  stashedSnapshot = null;
}

/** Collect pending editor JSON before locale migration (handler or unmount stash). */
export async function flushEditorAutosave(): Promise<string | null> {
  let result: EditorAutosaveFlushResult = { content: null, persisted: true };
  if (flushHandler) {
    result = await flushHandler();
  } else {
    const snapshot = takeStashedEditorAutosave();
    if (snapshot) {
      result = { content: snapshot.content, persisted: true };
    }
  }
  if (result.persisted) {
    await checkpointStorageAfterFlush();
  }
  return result.content;
}
