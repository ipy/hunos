export type NoteStatus = 'active' | 'archived' | 'trashed';

export interface Note {
  id: string;
  title: string;
  content: string;
  contentPlain: string;
  isPinned: boolean;
  status: NoteStatus;
  trashedAt: number | null;
  createdAt: number;
  modifiedAt: number;
  wordCount: number;
}

export interface NoteFilter {
  status?: NoteStatus;
  isPinned?: boolean;
  tagId?: string;
  sortBy?: 'modifiedAt' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
