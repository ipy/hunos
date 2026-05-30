import { db } from "./database";
import type { Tag, NoteTag } from "@/types/graph";
import { getTagDisplayName, isValidTagName } from "@/utils/tagPattern";
import { generateId } from "@/utils/uuid";

export const tagStorage = {
  async create(
    name: string,
    parentId: string | null = null,
  ): Promise<Tag | null> {
    if (!isValidTagName(name)) return null;

    const displayName = getTagDisplayName(name);
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
    return db.tags.where("name").equals(name).first();
  },

  async getOrCreate(name: string): Promise<Tag | null> {
    if (!isValidTagName(name)) return null;

    const existing = await this.getByName(name);
    if (existing) return existing;

    let parentId: string | null = null;
    if (name.includes("/")) {
      const parts = name.split("/");
      const parentName = parts.slice(0, -1).join("/");
      const parent = await this.getOrCreate(parentName);
      if (!parent) return null;
      parentId = parent.id;
    }

    return this.create(name, parentId);
  },

  async listAll(): Promise<Tag[]> {
    return db.tags.toArray();
  },

  async updateNoteCount(tagId: string): Promise<void> {
    const count = await db.noteTags.where("tagId").equals(tagId).count();
    await db.tags.update(tagId, { noteCount: count });
  },

  async delete(tagId: string): Promise<void> {
    await db.noteTags.where("tagId").equals(tagId).delete();
    await db.tags.delete(tagId);
  },

  /** Recreate missing slash-path parents and relink children after orphan cleanup. */
  async repairMissingParents(): Promise<number> {
    let repaired = 0;
    const allTags = await db.tags.toArray();
    const byName = new Map(allTags.map((tag) => [tag.name, tag]));

    for (const tag of allTags) {
      if (!tag.name.includes("/")) continue;
      const parentName = tag.name.split("/").slice(0, -1).join("/");
      if (!byName.has(parentName)) {
        const created = await this.getOrCreate(parentName);
        if (created) {
          byName.set(parentName, created);
          repaired += 1;
        }
      }
      const parent = byName.get(parentName);
      if (parent && tag.parentId !== parent.id) {
        await db.tags.update(tag.id, { parentId: parent.id });
        tag.parentId = parent.id;
        repaired += 1;
      }
    }

    return repaired;
  },

  async cleanOrphaned(): Promise<number> {
    const allTags = await db.tags.toArray();
    const parentIdsWithChildren = new Set(
      allTags
        .map((tag) => tag.parentId)
        .filter((id): id is string => Boolean(id)),
    );
    const orphaned = allTags.filter(
      (tag) => tag.noteCount === 0 && !parentIdsWithChildren.has(tag.id),
    );
    if (orphaned.length > 0) {
      await db.tags.bulkDelete(orphaned.map((t) => t.id));
    }
    return orphaned.length;
  },

  async deleteInvalid(): Promise<number> {
    const allTags = await db.tags.toArray();
    const invalid = allTags.filter(
      (t) => !isValidTagName(t.name) || !t.displayName.trim(),
    );
    for (const tag of invalid) {
      await this.delete(tag.id);
    }
    return invalid.length;
  },

  async addNoteTag(
    noteId: string,
    tagId: string,
    position: number,
  ): Promise<void> {
    const existing = await db.noteTags.get([noteId, tagId]);
    if (!existing) {
      await db.noteTags.add({ noteId, tagId, position });
      await this.updateNoteCount(tagId);
    }
  },

  async removeAllForNote(noteId: string): Promise<void> {
    const entries = await db.noteTags.where("noteId").equals(noteId).toArray();
    await db.noteTags.where("noteId").equals(noteId).delete();
    for (const entry of entries) {
      await this.updateNoteCount(entry.tagId);
    }
  },

  async getTagsForNote(noteId: string): Promise<Tag[]> {
    const noteTags = await db.noteTags.where("noteId").equals(noteId).toArray();
    const tags = await db.tags.bulkGet(noteTags.map((nt) => nt.tagId));
    return tags.filter((t): t is Tag => t !== undefined);
  },
};
