export type LinkType = "wiki_link" | "tag_ref" | "embed" | "entity";

export interface Link {
  id: string;
  sourceNoteId: string;
  targetNoteId: string;
  type: LinkType;
  context: string;
  position: number;
  createdAt: number;
}

export interface Tag {
  id: string;
  name: string;
  displayName: string;
  parentId: string | null;
  noteCount: number;
  createdAt: number;
}

export interface NoteTag {
  noteId: string;
  tagId: string;
  position: number;
}

export interface TagTreeNode extends Tag {
  children: TagTreeNode[];
  isExpanded: boolean;
}

export interface BacklinkResult {
  linkId: string;
  noteId: string;
  noteTitle: string;
  context: string;
  type: LinkType;
}
