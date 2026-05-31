import { noteStorage } from "@/storage/noteStorage";
import { useNoteStore } from "@/store/noteStore";
import { useUIStore } from "@/store/uiStore";
import { parseNoteIdFromLocation } from "@/utils/noteRoute";

/** Open the note referenced by `#note/<id>` (AC41-hash-deep-link). */
export async function hydrateActiveNoteFromLocationHash(): Promise<void> {
  if (typeof window === "undefined") return;

  const noteId = parseNoteIdFromLocation();
  if (!noteId) return;

  const store = useNoteStore.getState();
  const inList = store.notes.find((note) => note.id === noteId);
  const note = inList ?? (await noteStorage.get(noteId).catch(() => undefined));
  if (!note || note.status !== "active") return;

  if (store.activeNoteId !== noteId) {
    await store.setActiveNote(noteId);
  }

  useUIStore.getState().navigate("editor");
}
