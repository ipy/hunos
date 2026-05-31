import { db } from "./database";
import type { Note, NoteFilter, NoteStatus } from "@/types/note";
import { generateId } from "@/utils/uuid";
import {
  extractFromPlainText,
  extractPlainTextFromTiptap,
} from "@/graph/linkExtractor";
import { sanitizeBlockImageNoteContent } from "@/utils/migrateBlockImageFloor";
import { filterNotesByTitleFirstSearch } from "./noteSearchRank";

function deriveContentPlain(content: string): string {
  if (!content) {
    return "";
  }
  try {
    return extractPlainTextFromTiptap(JSON.parse(content));
  } catch {
    return content;
  }
}

function deriveWordCount(plainText: string): number {
  return extractFromPlainText(plainText).wordCount;
}

async function hydrateNoteFromDb(note: Note): Promise<Note> {
  const { content, changed: contentChanged } = sanitizeBlockImageNoteContent(
    note.content,
  );
  const derivedPlain = deriveContentPlain(content);
  const needsPlainBackfill = note.contentPlain == null;
  const plainIsStale =
    !needsPlainBackfill && contentChanged && note.contentPlain !== derivedPlain;
  const contentPlain =
    needsPlainBackfill || plainIsStale ? derivedPlain : note.contentPlain;

  if (!contentChanged && !needsPlainBackfill && !plainIsStale) {
    return note;
  }

  const updates: Partial<Note> = {};
  if (contentChanged) {
    updates.content = content;
  }
  if (needsPlainBackfill || plainIsStale) {
    updates.contentPlain = contentPlain;
  }
  await db.notes.update(note.id, updates);
  return { ...note, content, contentPlain };
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
      if (partial.contentPlain == null) {
        note.contentPlain = deriveContentPlain(note.content);
      }
      if (partial.wordCount == null) {
        note.wordCount = deriveWordCount(note.contentPlain);
      }
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
      const plainForDerivation =
        updates.contentPlain ?? deriveContentPlain(payload.content);
      if (updates.contentPlain == null) {
        payload.contentPlain = plainForDerivation;
      }
      if (updates.wordCount == null) {
        payload.wordCount = deriveWordCount(plainForDerivation);
      }
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
    const active = await db.notes
      .filter((note) => note.status === "active")
      .toArray();
    const searchable = active.map((note) => ({
      ...note,
      contentPlain: note.contentPlain ?? deriveContentPlain(note.content ?? ""),
    }));
    const matched = filterNotesByTitleFirstSearch(searchable, query);
    return Promise.all(matched.map(hydrateNoteFromDb));
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
