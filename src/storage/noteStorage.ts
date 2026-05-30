import { db } from "./database";
import type { Note, NoteFilter, NoteStatus } from "@/types/note";
import { generateId } from "@/utils/uuid";
import { sanitizeBlockImageNoteContent } from "@/utils/migrateBlockImageFloor";

async function hydrateNoteFromDb(note: Note): Promise<Note> {
  const { content, changed } = sanitizeBlockImageNoteContent(note.content);
  if (!changed) {
    return note;
  }
  await db.notes.update(note.id, { content });
  return { ...note, content };
}

function sanitizeContentForWrite(content: string): string {
  return sanitizeBlockImageNoteContent(content).content;
}

export const noteStorage = {
  async create(partial?: Partial<Note>): Promise<Note> {
    const now = Date.now();
    const note: Note = {
      id: generateId(),
      title: "",
      content: "",
      contentPlain: "",
      isPinned: false,
      status: "active",
      trashedAt: null,
      createdAt: now,
      modifiedAt: now,
      wordCount: 0,
      ...partial,
    };
    if (partial?.content !== undefined) {
      note.content = sanitizeContentForWrite(partial.content);
    }
    await db.notes.add(note);
    return note;
  },

  async get(id: string): Promise<Note | undefined> {
    const note = await db.notes.get(id);
    if (!note) {
      return undefined;
    }
    return hydrateNoteFromDb(note);
  },

  async update(
    id: string,
    updates: Partial<Note>,
  ): Promise<{ content?: string } | undefined> {
    const payload: Partial<Note> & { modifiedAt: number } = {
      ...updates,
      modifiedAt: Date.now(),
    };
    if (updates.content !== undefined) {
      payload.content = sanitizeBlockImageNoteContent(updates.content).content;
    }
    await db.notes.update(id, payload);
    return updates.content !== undefined
      ? { content: payload.content as string }
      : undefined;
  },

  async delete(id: string): Promise<void> {
    await db.notes.delete(id);
  },

  async list(filter: NoteFilter = {}): Promise<Note[]> {
    const {
      status = "active",
      isPinned,
      sortBy = "modifiedAt",
      sortOrder = "desc",
      limit,
      offset = 0,
    } = filter;

    let collection = db.notes.where("status").equals(status);

    let results = await collection.toArray();

    if (isPinned !== undefined) {
      results = results.filter((n) => n.isPinned === isPinned);
    }

    results.sort((a, b) => {
      let cmp: number;
      if (sortBy === "title") {
        cmp = a.title.localeCompare(b.title);
      } else {
        cmp = (a[sortBy] as number) - (b[sortBy] as number);
      }
      return sortOrder === "desc" ? -cmp : cmp;
    });

    if (offset > 0) results = results.slice(offset);
    if (limit) results = results.slice(0, limit);

    return Promise.all(results.map(hydrateNoteFromDb));
  },

  async listByTag(tagId: string, filter: NoteFilter = {}): Promise<Note[]> {
    const noteTags = await db.noteTags.where("tagId").equals(tagId).toArray();
    const noteIds = noteTags.map((nt) => nt.noteId);
    if (noteIds.length === 0) return [];

    const notes = await db.notes.bulkGet(noteIds);
    let results = notes.filter(
      (n): n is Note =>
        n !== undefined && n.status === (filter.status || "active"),
    );

    const sortBy = filter.sortBy || "modifiedAt";
    const sortOrder = filter.sortOrder || "desc";
    results.sort((a, b) => {
      let cmp: number;
      if (sortBy === "title") {
        cmp = a.title.localeCompare(b.title);
      } else {
        cmp = (a[sortBy] as number) - (b[sortBy] as number);
      }
      return sortOrder === "desc" ? -cmp : cmp;
    });

    return Promise.all(results.map(hydrateNoteFromDb));
  },

  async search(query: string): Promise<Note[]> {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    return db.notes
      .filter(
        (note) =>
          note.status === "active" &&
          (note.title.toLowerCase().includes(lower) ||
            note.contentPlain.toLowerCase().includes(lower)),
      )
      .toArray()
      .then((notes) => Promise.all(notes.map(hydrateNoteFromDb)));
  },

  async count(status: NoteStatus = "active"): Promise<number> {
    return db.notes.where("status").equals(status).count();
  },

  async countUntagged(): Promise<number> {
    const allNoteIds = new Set(
      (await db.noteTags.toArray()).map((nt) => nt.noteId),
    );
    return db.notes
      .where("status")
      .equals("active")
      .filter((n) => !allNoteIds.has(n.id))
      .count();
  },

  async purgeTrash(olderThanMs: number): Promise<number> {
    const cutoff = Date.now() - olderThanMs;
    const toDelete = await db.notes
      .where("status")
      .equals("trashed")
      .filter((n) => n.trashedAt !== null && n.trashedAt < cutoff)
      .toArray();

    await db.notes.bulkDelete(toDelete.map((n) => n.id));
    return toDelete.length;
  },
};
