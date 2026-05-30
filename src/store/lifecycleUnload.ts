import {
  flushEditorAutosaveResult,
  type EditorAutosaveFlushResult,
} from "@/store/editorAutosaveRegistry";
import { useNoteStore } from "@/store/noteStore";

export const UNLOAD_BACKUP_KEY = "hunos:unload-backup";

export type UnloadBackup = {
  noteId: string;
  title?: string | null;
  content?: string | null;
  savedAt: number;
};

type UnloadDraftCollector = () => UnloadBackup | null;

let unloadDraftCollector: UnloadDraftCollector | null = null;
let inFlightFlush: Promise<EditorAutosaveFlushResult> | null = null;
let lastPersistedFlush: EditorAutosaveFlushResult | null = null;
let lastPersistedFlushAt = 0;

const FLUSH_COALESCE_MS = 500;

export function registerUnloadDraftCollector(
  collector: UnloadDraftCollector,
): void {
  unloadDraftCollector = collector;
}

export function unregisterUnloadDraftCollector(
  collector: UnloadDraftCollector,
): void {
  if (unloadDraftCollector === collector) {
    unloadDraftCollector = null;
  }
}

export function writeUnloadBackupSync(draft: UnloadBackup): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(UNLOAD_BACKUP_KEY, JSON.stringify(draft));
  } catch {
    // quota or private browsing
  }
}

export function peekUnloadBackup(): UnloadBackup | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(UNLOAD_BACKUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UnloadBackup;
  } catch {
    return null;
  }
}

export function takeUnloadBackup(): UnloadBackup | null {
  const backup = peekUnloadBackup();
  clearUnloadBackup();
  return backup;
}

export function clearUnloadBackup(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(UNLOAD_BACKUP_KEY);
  } catch {
    // ignore
  }
}

function collectAndPersistSyncBackup(): void {
  const draft = unloadDraftCollector?.();
  if (!draft?.noteId) return;
  writeUnloadBackupSync({ ...draft, savedAt: Date.now() });
}

/** Synchronous sessionStorage snapshot before SPA unmount or async flush (no await). */
export function persistUnloadDraftSync(): void {
  collectAndPersistSyncBackup();
}

/** Shared flush with dedupe — hide and unload paths reuse one in-flight write. */
export function scheduleLifecycleFlush(options?: {
  syncBackup?: boolean;
}): Promise<EditorAutosaveFlushResult> {
  if (options?.syncBackup) {
    collectAndPersistSyncBackup();
  }
  if (inFlightFlush) return inFlightFlush;

  const now = Date.now();
  if (
    lastPersistedFlush?.persisted &&
    now - lastPersistedFlushAt < FLUSH_COALESCE_MS
  ) {
    return Promise.resolve(lastPersistedFlush);
  }

  inFlightFlush = flushEditorAutosaveResult()
    .then((result) => {
      if (result.persisted) {
        clearUnloadBackup();
        lastPersistedFlush = result;
        lastPersistedFlushAt = Date.now();
      }
      return result;
    })
    .finally(() => {
      inFlightFlush = null;
    });

  return inFlightFlush;
}

/** Background hide — sync backup then await persist (same path as unload). */
export async function flushForDocumentHide(): Promise<EditorAutosaveFlushResult> {
  return scheduleLifecycleFlush({ syncBackup: true });
}

/** Tab close / navigation teardown — sync backup then await persist. */
export async function flushForPageUnload(
  event?: PageTransitionEvent,
): Promise<EditorAutosaveFlushResult | null> {
  if (event?.persisted) return null;
  return scheduleLifecycleFlush({ syncBackup: true });
}

/** Apply sessionStorage backup after reload when async flush did not finish. */
export async function recoverPendingUnloadBackup(): Promise<void> {
  const backup = takeUnloadBackup();
  if (!backup?.noteId) return;

  const store = useNoteStore.getState();
  if (backup.title != null && backup.title !== "") {
    await store.saveNoteTitle(backup.noteId, backup.title);
  }
  if (backup.content) {
    await store.saveNoteContent(backup.noteId, backup.content);
  }
}

/** @internal Test-only reset for listener state between cases. */
export function resetLifecycleUnloadForTests(): void {
  inFlightFlush = null;
  unloadDraftCollector = null;
  lastPersistedFlush = null;
  lastPersistedFlushAt = 0;
  clearUnloadBackup();
}
