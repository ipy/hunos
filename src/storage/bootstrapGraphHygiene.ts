import type { Locale } from "@/types/settings";
import { graphEngine } from "@/graph/graphEngine";
import { linkStorage } from "./linkStorage";
import { noteStorage } from "./noteStorage";
import {
  FORMAT_PLAYGROUND_TITLES,
  getFormatPlaygroundTitle,
  isFormatPlaygroundNote,
  pickFormatPlaygroundNote,
} from "./formatPlaygroundNote";
import { getBootstrapPlaygroundSeedContent } from "./bootstrapTagSeeds";
import { consolidateProjectDocsNotes } from "./welcomeNotes";

/** Drop duplicate canonical playground rows and resync seed wiki links. */
async function consolidateFormatPlaygroundNotes(locale: Locale): Promise<void> {
  const notes = await noteStorage.list({ status: "active" });
  const canonical = pickFormatPlaygroundNote(notes, locale);
  if (!canonical) return;

  const duplicates = notes.filter(
    (note) =>
      note.id !== canonical.id &&
      FORMAT_PLAYGROUND_TITLES.includes(note.title) &&
      isFormatPlaygroundNote(note.title, note.content),
  );

  for (const duplicate of duplicates) {
    await linkStorage.deleteBySource(duplicate.id);
    await noteStorage.delete(duplicate.id);
  }

  const seedContent = getBootstrapPlaygroundSeedContent(locale);
  const expectedTitle = getFormatPlaygroundTitle(locale);
  if (
    canonical.content !== seedContent ||
    canonical.title !== expectedTitle
  ) {
    await noteStorage.update(canonical.id, {
      content: seedContent,
      title: expectedTitle,
    });
  }
  await graphEngine.syncNoteLinks(canonical.id, seedContent);
}

/**
 * Idempotent graph hygiene for seed notes — one canonical 项目文档 target and
 * exactly two playground backlinks after polluted storage upgrades.
 */
export async function reconcileBootstrapGraph(locale: Locale): Promise<void> {
  const projectDocsId = await consolidateProjectDocsNotes(locale);
  await consolidateFormatPlaygroundNotes(locale);
  if (projectDocsId) {
    await linkStorage.dedupeIncomingWikiLinks(projectDocsId);
  }
}
