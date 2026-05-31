import { linkStorage } from "@/storage/linkStorage";
import { tagStorage } from "@/storage/tagStorage";
import { noteStorage } from "@/storage/noteStorage";
import {
  extractFromPlainText,
  extractPlainTextFromTiptap,
} from "./linkExtractor";
import { isValidTagName } from "@/utils/tagPattern";
import { replaceWikiLinkTitleInContent } from "@/utils/wikiLink";
import type { BacklinkResult } from "@/types/graph";
import type { Note } from "@/types/note";

function dedupeBacklinksByLinkId(results: BacklinkResult[]): BacklinkResult[] {
  const seen = new Set<string>();
  return results.filter((row) => {
    if (seen.has(row.linkId)) return false;
    seen.add(row.linkId);
    return true;
  });
}

export const graphEngine = {
  async syncNoteLinks(noteId: string, content: string): Promise<void> {
    let plainText: string;
    try {
      const json = JSON.parse(content);
      plainText = extractPlainTextFromTiptap(json);
    } catch {
      plainText = content;
    }

    const extraction = extractFromPlainText(plainText);

    await linkStorage.deleteBySourceAndType(noteId, "tag_ref");
    await linkStorage.deleteBySourceAndType(noteId, "wiki_link");
    await tagStorage.removeAllForNote(noteId);

    for (const tagRef of extraction.tags) {
      if (!isValidTagName(tagRef.name)) continue;

      const tag = await tagStorage.getOrCreate(tagRef.name);
      if (!tag) continue;

      await tagStorage.addNoteTag(noteId, tag.id, tagRef.position);
      await linkStorage.create(noteId, tag.id, "tag_ref", "", tagRef.position);
    }

    for (const wikiLink of extraction.wikiLinks) {
      const targetNotes = await noteStorage.search(wikiLink.title);
      const target = targetNotes.find(
        (n) => n.title.toLowerCase() === wikiLink.title.toLowerCase(),
      );

      if (target) {
        await linkStorage.create(
          noteId,
          target.id,
          "wiki_link",
          wikiLink.context,
          wikiLink.position,
        );
      }
    }
  },

  /** When a note title changes, update [[oldTitle]] wikilinks in every other note. */
  async renameWikiLinkTargets(
    oldTitle: string,
    newTitle: string,
  ): Promise<Note[]> {
    if (!oldTitle.trim() || !newTitle.trim() || oldTitle === newTitle) {
      return [];
    }

    const notes = await noteStorage.list({ status: "active" });
    const updated: Note[] = [];

    for (const note of notes) {
      if (!note.content) continue;
      const nextContent = replaceWikiLinkTitleInContent(
        note.content,
        oldTitle,
        newTitle,
      );
      if (nextContent === note.content) continue;

      await noteStorage.update(note.id, { content: nextContent });
      const fresh = await noteStorage.get(note.id);
      if (!fresh) continue;
      await graphEngine.syncNoteLinks(note.id, fresh.content);
      updated.push(fresh);
    }

    return updated;
  },

  async getBacklinks(noteId: string): Promise<BacklinkResult[]> {
    const incoming = await linkStorage.getIncoming(noteId);
    const wikiLinks = incoming.filter((l) => l.type === "wiki_link");

    const results: BacklinkResult[] = [];
    for (const link of wikiLinks) {
      const note = await noteStorage.get(link.sourceNoteId);
      if (note && note.status === "active") {
        results.push({
          linkId: link.id,
          noteId: note.id,
          noteTitle: note.title,
          context: link.context,
          type: link.type,
        });
      }
    }

    return dedupeBacklinksByLinkId(results);
  },

  async getOutgoingLinks(noteId: string): Promise<BacklinkResult[]> {
    const outgoing = await linkStorage.getOutgoing(noteId);
    const wikiLinks = outgoing.filter((l) => l.type === "wiki_link");

    const results: BacklinkResult[] = [];
    for (const link of wikiLinks) {
      const note = await noteStorage.get(link.targetNoteId);
      if (note && note.status === "active") {
        results.push({
          linkId: link.id,
          noteId: note.id,
          noteTitle: note.title,
          context: link.context,
          type: "wiki_link",
        });
      }
    }

    return dedupeBacklinksByLinkId(results);
  },
};
