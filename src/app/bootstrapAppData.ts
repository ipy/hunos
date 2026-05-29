import type { Locale } from "@/types/settings";
import { createWelcomeNotesIfNeeded } from "@/storage/welcomeNotes";
import { syncFormatPlaygroundOnLocaleChange } from "@/storage/formatPlaygroundNote";
import { flushEditorAutosave } from "@/store/editorAutosaveRegistry";
import { useNoteStore } from "@/store/noteStore";
import { useTagStore } from "@/store/tagStore";
import { noteStorage } from "@/storage/noteStorage";

const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/** Seed notes, reconcile playground locale, then hydrate stores before first paint. */
export async function bootstrapAppData(locale: Locale): Promise<void> {
  await createWelcomeNotesIfNeeded(locale);
  const flushedContent = await flushEditorAutosave();
  await syncFormatPlaygroundOnLocaleChange(locale, flushedContent);
  await useNoteStore.getState().loadNotes({ status: "active" });
  useTagStore.getState().loadTags();
  void noteStorage.purgeTrash(TRASH_RETENTION_MS);
}
