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
