type EditorAutosaveFlush = () => Promise<string | null>;

let flushHandler: EditorAutosaveFlush | null = null;

export function registerEditorAutosaveFlush(handler: EditorAutosaveFlush): void {
  flushHandler = handler;
}

export function unregisterEditorAutosaveFlush(handler: EditorAutosaveFlush): void {
  if (flushHandler === handler) {
    flushHandler = null;
  }
}

/** Persist any debounced editor content before locale migration or unmount. */
export async function flushEditorAutosave(): Promise<string | null> {
  if (!flushHandler) {
    return null;
  }
  return flushHandler();
}
