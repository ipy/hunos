import { create } from 'zustand';
import type { Note, NoteFilter } from '@/types/note';
import { noteStorage } from '@/storage/noteStorage';
import { graphEngine } from '@/graph/graphEngine';
import { useTagStore } from '@/store/tagStore';

function sortByModifiedDesc(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.modifiedAt - a.modifiedAt);
}

interface NoteStore {
  notes: Note[];
  activeNoteId: string | null;
  isLoading: boolean;

  loadNotes: (filter?: NoteFilter) => Promise<void>;
  loadNotesByTag: (tagId: string, filter?: NoteFilter) => Promise<void>;
  createNote: (title?: string) => Promise<Note>;
  saveNoteContent: (id: string, content: string) => Promise<void>;
  saveNoteTitle: (id: string, title: string) => Promise<void>;
  pinNote: (id: string, pinned: boolean) => Promise<void>;
  archiveNote: (id: string) => Promise<void>;
  trashNote: (id: string) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  permanentlyDelete: (id: string) => Promise<void>;
  setActiveNote: (id: string | null) => void;
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  activeNoteId: null,
  isLoading: false,

  loadNotes: async (filter) => {
    set({ isLoading: true });
    const notes = await noteStorage.list(filter);
    set({ notes, isLoading: false });
  },

  loadNotesByTag: async (tagId, filter) => {
    set({ isLoading: true });
    const notes = await noteStorage.listByTag(tagId, filter);
    set({ notes, isLoading: false });
  },

  createNote: async (title?: string) => {
    const note = await noteStorage.create(title ? { title } : undefined);
    const { notes } = get();
    set({ notes: [note, ...notes], activeNoteId: note.id });
    return note;
  },

  saveNoteContent: async (id, content) => {
    await noteStorage.update(id, { content });
    await graphEngine.syncNoteLinks(id, content);
    await useTagStore.getState().loadTags();
    const updated = await noteStorage.get(id);
    if (updated) {
      const { notes } = get();
      set({
        notes: sortByModifiedDesc(notes.map(n => n.id === id ? updated : n)),
      });
    }
  },

  saveNoteTitle: async (id, title) => {
    const existing = get().notes.find(n => n.id === id) ?? (await noteStorage.get(id));
    const oldTitle = existing?.title ?? '';

    await noteStorage.update(id, { title });
    const now = Date.now();
    let notes = get().notes;
    notes = sortByModifiedDesc(
      notes.map(n => (n.id === id ? { ...n, title, modifiedAt: now } : n)),
    );

    if (oldTitle && oldTitle !== title) {
      const renamed = await graphEngine.renameWikiLinkTargets(oldTitle, title);
      if (renamed.length > 0) {
        const byId = new Map(renamed.map(n => [n.id, n]));
        notes = sortByModifiedDesc(
          notes.map(n => (byId.has(n.id) ? byId.get(n.id)! : n)),
        );
      }
    }

    set({ notes });
  },

  pinNote: async (id, isPinned) => {
    await noteStorage.update(id, { isPinned });
    const { notes } = get();
    set({ notes: sortByModifiedDesc(notes.map(n => n.id === id ? { ...n, isPinned } : n)) });
  },

  archiveNote: async (id) => {
    await noteStorage.update(id, { status: 'archived' });
    const { notes, activeNoteId } = get();
    set({
      notes: notes.filter(n => n.id !== id),
      activeNoteId: activeNoteId === id ? null : activeNoteId,
    });
  },

  trashNote: async (id) => {
    await noteStorage.update(id, { status: 'trashed', trashedAt: Date.now() });
    const { notes, activeNoteId } = get();
    set({
      notes: notes.filter(n => n.id !== id),
      activeNoteId: activeNoteId === id ? null : activeNoteId,
    });
  },

  restoreNote: async (id) => {
    await noteStorage.update(id, { status: 'active', trashedAt: null });
    const { notes } = get();
    set({ notes: notes.filter(n => n.id !== id) });
  },

  permanentlyDelete: async (id) => {
    await noteStorage.delete(id);
    const { notes, activeNoteId } = get();
    set({
      notes: notes.filter(n => n.id !== id),
      activeNoteId: activeNoteId === id ? null : activeNoteId,
    });
  },

  setActiveNote: (id) => set({ activeNoteId: id }),
}));
