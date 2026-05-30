import type { Locale } from "@/types/settings";
import { graphEngine } from "@/graph/graphEngine";
import { noteStorage } from "./noteStorage";
import { tagStorage } from "./tagStorage";
import {
  getBootstrapPlaygroundSeedContent,
  getBootstrapWelcomeSeedContent,
  getBootstrapWelcomeTitle,
  getFormatPlaygroundTitle,
} from "./bootstrapTagSeeds";
import { isFormatPlaygroundNote } from "./formatPlaygroundNote";

/** Re-sync seed-note tag refs from locale seeds and drop orphans so the sidebar matches bootstrap locale. */
export async function reconcileBootstrapTags(locale: Locale): Promise<void> {
  const welcomeTitle = getBootstrapWelcomeTitle(locale);
  const playgroundTitle = getFormatPlaygroundTitle(locale);
  const welcomeSeedContent = getBootstrapWelcomeSeedContent(locale);
  const playgroundSeedContent = getBootstrapPlaygroundSeedContent(locale);
  const notes = await noteStorage.list({ status: "active" });

  for (const note of notes) {
    if (note.title === welcomeTitle) {
      await graphEngine.syncNoteLinks(note.id, welcomeSeedContent);
      continue;
    }
    if (
      note.title === playgroundTitle ||
      isFormatPlaygroundNote(note.title, note.content)
    ) {
      await graphEngine.syncNoteLinks(note.id, playgroundSeedContent);
    }
  }

  await tagStorage.repairMissingParents();
  await tagStorage.cleanOrphaned();
}
