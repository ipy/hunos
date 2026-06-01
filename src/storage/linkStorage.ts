import { db } from "./database";
import type { Link, LinkType } from "@/types/graph";
import { generateId } from "@/utils/uuid";

export const linkStorage = {
  async create(
    sourceNoteId: string,
    targetNoteId: string,
    type: LinkType,
    context: string = "",
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
    return db.links.where("sourceNoteId").equals(noteId).toArray();
  },

  async getIncoming(noteId: string): Promise<Link[]> {
    return db.links.where("targetNoteId").equals(noteId).toArray();
  },

  async deleteBySource(sourceNoteId: string): Promise<void> {
    await db.links.where("sourceNoteId").equals(sourceNoteId).delete();
  },

  async deleteBySourceAndType(
    sourceNoteId: string,
    type: LinkType,
  ): Promise<void> {
    await db.links
      .where("[sourceNoteId+type]")
      .equals([sourceNoteId, type])
      .delete();
  },

  async delete(id: string): Promise<void> {
    await db.links.delete(id);
  },

  /** Move incoming wiki/tag links from a duplicate target note to the canonical one. */
  async repointIncomingTarget(
    fromTargetId: string,
    toTargetId: string,
  ): Promise<void> {
    if (fromTargetId === toTargetId) return;
    const incoming = await db.links
      .where("targetNoteId")
      .equals(fromTargetId)
      .toArray();
    for (const link of incoming) {
      await db.links.update(link.id, { targetNoteId: toTargetId });
    }
  },

  /** Drop duplicate wiki-link rows that share source + position on one target. */
  async dedupeIncomingWikiLinks(targetNoteId: string): Promise<void> {
    const incoming = await db.links
      .where("targetNoteId")
      .equals(targetNoteId)
      .toArray();
    const wikiLinks = incoming.filter((link) => link.type === "wiki_link");
    const seen = new Set<string>();
    for (const link of wikiLinks) {
      const key = `${link.sourceNoteId}:${link.position}`;
      if (seen.has(key)) {
        await db.links.delete(link.id);
      } else {
        seen.add(key);
      }
    }
  },
};
