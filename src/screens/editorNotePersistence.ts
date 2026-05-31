import i18n from "@/i18n";
import { useUIStore } from "@/store/uiStore";

export type PersistNoteOptions = {
  /** When false, failed saves return false without surfacing save-failed toast. */
  notifyOnError?: boolean;
};

export async function persistNoteContent(
  save: (
    id: string,
    content: string,
    writeEpoch?: number,
  ) => Promise<boolean | void>,
  noteId: string,
  content: string,
  writeEpoch?: number,
  options: PersistNoteOptions = {},
): Promise<boolean> {
  const notifyOnError = options.notifyOnError !== false;
  try {
    const saved = await save(noteId, content, writeEpoch);
    return saved !== false;
  } catch {
    if (notifyOnError) {
      useUIStore.getState().showToast(i18n.t("editor.saveFailed"), "error");
    }
    return false;
  }
}

export async function persistNoteTitle(
  save: (id: string, title: string, writeEpoch?: number) => Promise<void>,
  noteId: string,
  title: string,
  writeEpoch?: number,
  options: PersistNoteOptions = {},
): Promise<boolean> {
  const notifyOnError = options.notifyOnError !== false;
  try {
    await save(noteId, title, writeEpoch);
    return true;
  } catch {
    if (notifyOnError) {
      useUIStore.getState().showToast(i18n.t("editor.saveFailed"), "error");
    }
    return false;
  }
}
