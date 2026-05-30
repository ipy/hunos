type EditorAutosaveFlush = () => Promise<string | null>;

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

/** Collect pending editor JSON before locale migration (handler or unmount stash). */
export async function flushEditorAutosave(): Promise<string | null> {
  if (flushHandler) {
    return flushHandler();
  }
  return takeStashedEditorAutosave()?.content ?? null;
}
