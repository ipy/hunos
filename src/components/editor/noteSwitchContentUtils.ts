function tryParseJson(str: string): object | string | undefined {
  if (!str) return undefined;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

/** Skip autosave echo sync so ProseMirror history is not reset by setContent. */
export function editorContentMatchesStoredJson(
  editorContentJson: string,
  storedContent: string,
): boolean {
  if (!storedContent) return false;
  return storedContent === editorContentJson;
}

export type NoteContentSyncOutcome = "noop" | "skipped-echo" | "applied";

export interface NoteContentSyncActions {
  initialContent: string;
  noteChanged: boolean;
  contentChangedExternally: boolean;
  editorContentJson: string;
  setContent: (parsed: object) => void;
  clearContent: () => void;
  resetHistory: () => void;
  focusStart: () => void;
}

/**
 * Apply note-switch or external content updates to the editor.
 * Resets undo history on note change or external content replace (e.g. playground locale).
 */
export function syncNoteContentInEditor(
  actions: NoteContentSyncActions,
): NoteContentSyncOutcome {
  const { noteChanged, contentChangedExternally } = actions;

  if (!noteChanged && !contentChangedExternally) {
    return "noop";
  }

  if (
    !noteChanged &&
    contentChangedExternally &&
    editorContentMatchesStoredJson(
      actions.editorContentJson,
      actions.initialContent,
    )
  ) {
    return "skipped-echo";
  }

  if (!actions.initialContent) {
    actions.clearContent();
  } else {
    const parsed = tryParseJson(actions.initialContent);
    if (parsed && typeof parsed === "object") {
      actions.setContent(parsed);
    }
  }

  if (noteChanged || contentChangedExternally) {
    actions.resetHistory();
  }
  if (noteChanged) {
    actions.focusStart();
  }

  return "applied";
}
