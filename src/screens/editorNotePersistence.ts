import i18n from "@/i18n";
import { useUIStore } from "@/store/uiStore";

export async function persistNoteContent(
  save: (
    id: string,
    content: string,
    writeEpoch?: number,
  ) => Promise<boolean | void>,
  noteId: string,
  content: string,
  writeEpoch?: number,
): Promise<boolean> {
  try {
    const saved = await save(noteId, content, writeEpoch);
    return saved !== false;
  } catch {
    useUIStore.getState().showToast(i18n.t("editor.saveFailed"), "error");
    return false;
  }
}

export async function persistNoteTitle(
  save: (id: string, title: string, writeEpoch?: number) => Promise<void>,
  noteId: string,
  title: string,
  writeEpoch?: number,
): Promise<boolean> {
  try {
    await save(noteId, title, writeEpoch);
    return true;
  } catch {
    useUIStore.getState().showToast(i18n.t("editor.saveFailed"), "error");
    return false;
  }
}
