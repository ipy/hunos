/** Skip effect-cleanup persist when setActiveNote already flushed for another note. */
export function shouldPersistAutosaveOnEditorEffectCleanup(
  boundNoteId: string | null | undefined,
  currentActiveNoteId: string | null,
): boolean {
  if (!boundNoteId) return false;
  return boundNoteId === currentActiveNoteId;
}

/** Ignore debounced autosave when the editor already switched to another note. */
export function isDebouncedAutosaveStillCurrent(
  scheduledNoteId: string | null | undefined,
  currentActiveNoteId: string | null,
): boolean {
  if (!scheduledNoteId) return false;
  return scheduledNoteId === currentActiveNoteId;
}

/** Prefer live ProseMirror JSON on flush — pending ref can lag behind rapid edits. */
export function resolveEditorAutosaveContentJson(options: {
  editor: { isDestroyed: boolean; getJSON: () => unknown } | null;
  pendingContentJson: string | null;
}): string | null {
  const { editor, pendingContentJson } = options;
  if (editor && !editor.isDestroyed) {
    try {
      return JSON.stringify(editor.getJSON());
    } catch {
      // fall through to pending stash
    }
  }
  return pendingContentJson;
}
