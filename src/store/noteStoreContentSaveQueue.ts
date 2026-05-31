const contentSaveChainByNoteId = new Map<string, Promise<boolean>>();

/** Serialize content saves per note so graph sync does not race during rapid switches. */
export function enqueueNoteContentSave(
  noteId: string,
  task: () => Promise<boolean>,
): Promise<boolean> {
  const previous =
    contentSaveChainByNoteId.get(noteId) ?? Promise.resolve(true);
  const next = previous.catch(() => undefined).then(task);
  contentSaveChainByNoteId.set(noteId, next);
  return next.finally(() => {
    if (contentSaveChainByNoteId.get(noteId) === next) {
      contentSaveChainByNoteId.delete(noteId);
    }
  });
}

/** @internal Test-only reset. */
export function resetNoteContentSaveQueueForTests(): void {
  contentSaveChainByNoteId.clear();
}
