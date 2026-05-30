import type { Locale } from "@/types/settings";
import { createWelcomeNotesIfNeeded } from "@/storage/welcomeNotes";
import { syncFormatPlaygroundOnLocaleChange } from "@/storage/formatPlaygroundNote";
import {
  clearStashedEditorAutosave,
  flushEditorAutosave,
} from "@/store/editorAutosaveRegistry";
import { recoverPendingUnloadBackup } from "@/store/lifecycleUnload";
import { useNoteStore } from "@/store/noteStore";
import { useTagStore } from "@/store/tagStore";
import { noteStorage } from "@/storage/noteStorage";

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/** Seed notes, hydrate stores, reconcile playground locale, then load tags before first paint. */
export async function bootstrapAppData(locale: Locale): Promise<void> {
  await createWelcomeNotesIfNeeded(locale);
  await useNoteStore.getState().loadNotes({ status: "active" });
  await recoverPendingUnloadBackup(locale);
  const flushedContent = await flushEditorAutosave();
  await syncFormatPlaygroundOnLocaleChange(locale, flushedContent, {
    focusCanonical: true,
  });
  clearStashedEditorAutosave();
  useTagStore.getState().loadTags();
  void noteStorage.purgeTrash(TRASH_RETENTION_MS);
}
