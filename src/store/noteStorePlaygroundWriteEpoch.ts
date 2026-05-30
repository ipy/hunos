const epochByNoteId = new Map<string, number>();

/** Bump before durable playground restore so in-flight editor saves are ignored. */
export function bumpPlaygroundWriteEpoch(noteId: string): number {
  const next = (epochByNoteId.get(noteId) ?? 0) + 1;
  epochByNoteId.set(noteId, next);
  return next;
}

export function getPlaygroundWriteEpoch(noteId: string): number {
  return epochByNoteId.get(noteId) ?? 0;
}

export function isStalePlaygroundWrite(
  noteId: string,
  writeEpoch: number | undefined,
): boolean {
  if (writeEpoch == null) return false;
  return writeEpoch < getPlaygroundWriteEpoch(noteId);
}

/** @internal Test-only reset. */
export function resetPlaygroundWriteEpochForTests(): void {
  epochByNoteId.clear();
}
