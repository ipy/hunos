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
const stashedByNoteId = new Map<string, string>();

function firstStashedSnapshot(): EditorAutosaveSnapshot | null {
  const entry = stashedByNoteId.entries().next();
  if (entry.done) return null;
  const [noteId, content] = entry.value;
  return { noteId, content };
}

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
  stashedByNoteId.set(noteId, content);
}

export function peekStashedEditorAutosave(): EditorAutosaveSnapshot | null {
  return firstStashedSnapshot();
}

export function peekStashedEditorAutosaveForNote(
  noteId: string,
): EditorAutosaveSnapshot | null {
  const content = stashedByNoteId.get(noteId);
  if (content == null) return null;
  return { noteId, content };
}

export function takeStashedEditorAutosave(): EditorAutosaveSnapshot | null {
  const snapshot = firstStashedSnapshot();
  if (snapshot) {
    stashedByNoteId.delete(snapshot.noteId);
  }
  return snapshot;
}

export function takeStashedEditorAutosaveForNote(
  noteId: string,
): EditorAutosaveSnapshot | null {
  const content = stashedByNoteId.get(noteId);
  if (content == null) return null;
  stashedByNoteId.delete(noteId);
  return { noteId, content };
}

/** Drop pending stash after locale sync or when noteId no longer matches. */
export function clearStashedEditorAutosave(noteId?: string): void {
  if (noteId) {
    stashedByNoteId.delete(noteId);
    return;
  }
  stashedByNoteId.clear();
}

/** Collect pending editor JSON before locale migration (handler or unmount stash). */
export async function flushEditorAutosaveResult(): Promise<EditorAutosaveFlushResult> {
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
  return result;
}

export async function flushEditorAutosave(): Promise<string | null> {
  const result = await flushEditorAutosaveResult();
  return result.content;
}
