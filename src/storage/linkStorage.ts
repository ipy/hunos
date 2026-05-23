import { db } from './database';
import type { Link, LinkType } from '@/types/graph';
import { generateId } from '@/utils/uuid';

export const linkStorage = {
  async create(
    sourceNoteId: string,
    targetNoteId: string,
    type: LinkType,
    context: string = '',
    position: number = 0,
  ): Promise<Link> {
    const link: Link = {
      id: generateId(),
      sourceNoteId,
      targetNoteId,
      type,
      context,
      position,
      createdAt: Date.now(),
    };
    await db.links.add(link);
    return link;
  },

  async getOutgoing(noteId: string): Promise<Link[]> {
    return db.links.where('sourceNoteId').equals(noteId).toArray();
  },

  async getIncoming(noteId: string): Promise<Link[]> {
    return db.links.where('targetNoteId').equals(noteId).toArray();
  },

  async deleteBySource(sourceNoteId: string): Promise<void> {
    await db.links.where('sourceNoteId').equals(sourceNoteId).delete();
  },

  async deleteBySourceAndType(sourceNoteId: string, type: LinkType): Promise<void> {
    await db.links
      .where('[sourceNoteId+type]')
      .equals([sourceNoteId, type])
      .delete();
  },

  async delete(id: string): Promise<void> {
    await db.links.delete(id);
  },
};
