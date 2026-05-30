import type { Locale } from "@/types/settings";
import { graphEngine } from "@/graph/graphEngine";
import { noteStorage } from "./noteStorage";
import { tagStorage } from "./tagStorage";
import {
  getFormatPlaygroundTitle,
  isFormatPlaygroundNote,
} from "./formatPlaygroundNote";
import { getWelcomeSeed } from "./welcomeNotes";

/** Re-sync seed-note tag refs and drop orphans so the sidebar matches bootstrap locale. */
export async function reconcileBootstrapTags(locale: Locale): Promise<void> {
  const welcomeTitle = getWelcomeSeed(locale).title;
  const playgroundTitle = getFormatPlaygroundTitle(locale);
  const notes = await noteStorage.list({ status: "active" });

  for (const note of notes) {
    const isWelcome = note.title === welcomeTitle;
    const isPlayground =
      note.title === playgroundTitle ||
      isFormatPlaygroundNote(note.title, note.content);
    if (!isWelcome && !isPlayground) continue;
    if (!note.content) continue;
    await graphEngine.syncNoteLinks(note.id, note.content);
  }

  await tagStorage.cleanOrphaned();
}
