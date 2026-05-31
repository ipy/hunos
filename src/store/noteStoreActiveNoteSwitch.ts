import { flushEditorAutosave } from "@/store/editorAutosaveRegistry";
import { syncActiveNoteUrl } from "@/utils/noteRoute";

let activeNoteSwitchQueue: Promise<void> = Promise.resolve();

/** Serialize note switches so each pending autosave flush completes before the next id change. */
export function enqueueActiveNoteSwitch(
  nextId: string | null,
  getCurrentId: () => string | null,
  apply: (id: string | null) => void,
): Promise<void> {
  activeNoteSwitchQueue = activeNoteSwitchQueue.then(async () => {
    const currentId = getCurrentId();
    if (nextId === currentId) return;
    await flushEditorAutosave();
    apply(nextId);
    syncActiveNoteUrl(nextId);
  });

  return activeNoteSwitchQueue;
}

/** @internal Test-only reset for queued switch state between cases. */
export function resetActiveNoteSwitchQueueForTests(): void {
  activeNoteSwitchQueue = Promise.resolve();
}
