import { linkStorage } from '@/storage/linkStorage';
import { tagStorage } from '@/storage/tagStorage';
import { noteStorage } from '@/storage/noteStorage';
import { extractFromPlainText, extractPlainTextFromTiptap } from './linkExtractor';
import type { BacklinkResult } from '@/types/graph';

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

    await linkStorage.deleteBySourceAndType(noteId, 'tag_ref');
    await linkStorage.deleteBySourceAndType(noteId, 'wiki_link');
    await tagStorage.removeAllForNote(noteId);

    for (const tagRef of extraction.tags) {
      const tag = await tagStorage.getOrCreate(tagRef.name);
      await tagStorage.addNoteTag(noteId, tag.id, tagRef.position);
      await linkStorage.create(noteId, tag.id, 'tag_ref', '', tagRef.position);
    }

    for (const wikiLink of extraction.wikiLinks) {
      const targetNotes = await noteStorage.search(wikiLink.title);
      const target = targetNotes.find(
        n => n.title.toLowerCase() === wikiLink.title.toLowerCase()
      );

      if (target) {
        await linkStorage.create(
          noteId,
          target.id,
          'wiki_link',
          wikiLink.context,
          wikiLink.position,
        );
      }
    }

    const existingNote = await noteStorage.get(noteId);
    const shouldUpdateTitle = extraction.title
      && extraction.title !== 'Untitled'
      && extraction.plainText.trim().length > 0;

    await noteStorage.update(noteId, {
      ...(shouldUpdateTitle || !existingNote?.title ? { title: extraction.title } : {}),
      contentPlain: extraction.plainText,
      wordCount: extraction.wordCount,
    });
  },

  async getBacklinks(noteId: string): Promise<BacklinkResult[]> {
    const incoming = await linkStorage.getIncoming(noteId);
    const wikiLinks = incoming.filter(l => l.type === 'wiki_link');

    const results: BacklinkResult[] = [];
    for (const link of wikiLinks) {
      const note = await noteStorage.get(link.sourceNoteId);
      if (note && note.status === 'active') {
        results.push({
          noteId: note.id,
          noteTitle: note.title,
          context: link.context,
          type: link.type,
        });
      }
    }

    return results;
  },

  async getOutgoingLinks(noteId: string): Promise<BacklinkResult[]> {
    const outgoing = await linkStorage.getOutgoing(noteId);
    const wikiLinks = outgoing.filter(l => l.type === 'wiki_link');

    const results: BacklinkResult[] = [];
    for (const link of wikiLinks) {
      const note = await noteStorage.get(link.targetNoteId);
      if (note && note.status === 'active') {
        results.push({
          noteId: note.id,
          noteTitle: note.title,
          context: link.context,
          type: 'wiki_link',
        });
      }
    }

    return results;
  },
};
