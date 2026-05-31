export const TITLE_AUTOSAVE_DEBOUNCE_MS = 400;

export type PendingTitleTimerRef = {
  current: ReturnType<typeof setTimeout> | undefined;
};

export type PendingTitleRef = {
  current: string | null;
};

export function clearPendingTitleTimer(timerRef: PendingTitleTimerRef): void {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
  }
}

/** Track debounced title edits; flush via takePendingTitle before switch/lifecycle. */
export function markPendingTitle(
  pendingTitleRef: PendingTitleRef,
  timerRef: PendingTitleTimerRef,
  title: string,
  onDebouncedSave: (
    title: string,
    writeEpoch: number,
  ) => boolean | Promise<boolean>,
  writeEpoch: number,
  isStillCurrent?: () => boolean,
): void {
  pendingTitleRef.current = title;
  clearPendingTitleTimer(timerRef);
  const scheduledEpoch = writeEpoch;
  timerRef.current = setTimeout(() => {
    const pending = pendingTitleRef.current;
    if (pending == null) return;
    if (isStillCurrent && !isStillCurrent()) return;
    void Promise.resolve(onDebouncedSave(pending, scheduledEpoch)).then(
      (saved) => {
        if (saved) {
          pendingTitleRef.current = null;
        }
      },
    );
  }, TITLE_AUTOSAVE_DEBOUNCE_MS);
}

/** Cancel debounce and return the title awaiting persistence, if any. */
export function takePendingTitle(
  pendingTitleRef: PendingTitleRef,
  timerRef: PendingTitleTimerRef,
): string | null {
  clearPendingTitleTimer(timerRef);
  const title = pendingTitleRef.current;
  pendingTitleRef.current = null;
  return title;
}
