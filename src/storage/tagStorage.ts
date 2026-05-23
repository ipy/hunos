import { db } from './database';
import type { Tag, NoteTag } from '@/types/graph';
import { generateId } from '@/utils/uuid';

export const tagStorage = {
  async create(name: string, parentId: string | null = null): Promise<Tag> {
    const displayName = name.includes('/') ? name.split('/').pop()! : name;
    const tag: Tag = {
      id: generateId(),
      name,
      displayName,
      parentId,
      noteCount: 0,
      createdAt: Date.now(),
    };
    await db.tags.add(tag);
    return tag;
  },

  async getByName(name: string): Promise<Tag | undefined> {
    return db.tags.where('name').equals(name).first();
  },

  async getOrCreate(name: string): Promise<Tag> {
    const existing = await this.getByName(name);
    if (existing) return existing;

    let parentId: string | null = null;
    if (name.includes('/')) {
      const parts = name.split('/');
      const parentName = parts.slice(0, -1).join('/');
      const parent = await this.getOrCreate(parentName);
      parentId = parent.id;
    }

    return this.create(name, parentId);
  },

  async listAll(): Promise<Tag[]> {
    return db.tags.toArray();
  },

  async updateNoteCount(tagId: string): Promise<void> {
    const count = await db.noteTags.where('tagId').equals(tagId).count();
    await db.tags.update(tagId, { noteCount: count });
  },

  async delete(tagId: string): Promise<void> {
    await db.noteTags.where('tagId').equals(tagId).delete();
    await db.tags.delete(tagId);
  },

  async cleanOrphaned(): Promise<number> {
    const allTags = await db.tags.toArray();
    const orphaned = allTags.filter(t => t.noteCount === 0);
    if (orphaned.length > 0) {
      await db.tags.bulkDelete(orphaned.map(t => t.id));
    }
    return orphaned.length;
  },

  async addNoteTag(noteId: string, tagId: string, position: number): Promise<void> {
    const existing = await db.noteTags.get([noteId, tagId]);
    if (!existing) {
      await db.noteTags.add({ noteId, tagId, position });
      await this.updateNoteCount(tagId);
    }
  },

  async removeAllForNote(noteId: string): Promise<void> {
    const entries = await db.noteTags.where('noteId').equals(noteId).toArray();
    await db.noteTags.where('noteId').equals(noteId).delete();
    for (const entry of entries) {
      await this.updateNoteCount(entry.tagId);
    }
  },

  async getTagsForNote(noteId: string): Promise<Tag[]> {
    const noteTags = await db.noteTags.where('noteId').equals(noteId).toArray();
    const tags = await db.tags.bulkGet(noteTags.map(nt => nt.tagId));
    return tags.filter((t): t is Tag => t !== undefined);
  },
};
