import Dexie, { type Table } from "dexie";
import type { Note } from "@/types/note";
import type { Link, Tag, NoteTag } from "@/types/graph";

interface SettingRecord {
  key: string;
  value: unknown;
}

export class HunosDatabase extends Dexie {
  notes!: Table<Note, string>;
  links!: Table<Link, string>;
  tags!: Table<Tag, string>;
  noteTags!: Table<NoteTag, [string, string]>;
  settings!: Table<SettingRecord, string>;

  constructor() {
    super("hunos");
    this.version(1).stores({
      notes: "id, title, status, isPinned, createdAt, modifiedAt",
      links:
        "id, sourceNoteId, targetNoteId, type, createdAt, [sourceNoteId+type], [targetNoteId+type]",
      tags: "id, &name, parentId, noteCount",
      noteTags: "[noteId+tagId], noteId, tagId",
      settings: "key",
    });
  }
}

export const db = new HunosDatabase();
