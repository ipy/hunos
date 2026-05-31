import { create } from "zustand";
import type { Note } from "@/types/note";
import { noteStorage } from "@/storage/noteStorage";
import { isMobileViewport } from "@/hooks/useAdaptiveLayout";
import { clearLinkEditorSelection } from "@/components/editor/linkEditorSelection";
import { scheduleLifecycleFlush } from "@/store/lifecycleUnload";

type Screen = "tags" | "noteList" | "editor" | "settings";

interface Toast {
  id: string;
  message: string;
  type: "info" | "success" | "error";
}

interface UIStore {
  currentScreen: Screen;
  screenStack: Screen[];
  searchQuery: string;
  searchResults: Note[];
  isSearching: boolean;
  sidebarVisible: boolean;
  focusMode: boolean;
  noteSearchOpen: boolean;
  findInNoteSignal: number;
  findInNoteReplaceMode: boolean;
  focusNewNoteTitleSignal: number;
  linkEditorOpen: boolean;
  toasts: Toast[];

  navigate: (screen: Screen) => void;
  goBack: () => void;
  returnToNoteList: () => void;
  setSearchQuery: (query: string) => void;
  performSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
  showSidebar: () => void;
  hideSidebar: () => void;
  toggleSidebar: () => void;
  setFocusMode: (enabled: boolean) => void;
  toggleFocusMode: () => void;
  openNoteSearch: () => void;
  clearNoteSearchOpen: () => void;
  requestFindInNote: (options?: { replace?: boolean }) => void;
  requestFocusNewNoteTitle: () => void;
  clearFocusNewNoteTitle: () => void;
  openLinkEditor: () => void;
  closeLinkEditor: () => void;
  showToast: (message: string, type?: Toast["type"]) => void;
  dismissToast: (id: string) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  currentScreen: "noteList",
  screenStack: ["noteList"],
  searchQuery: "",
  searchResults: [],
  isSearching: false,
  sidebarVisible: false,
  focusMode: false,
  noteSearchOpen: false,
  findInNoteSignal: 0,
  findInNoteReplaceMode: false,
  focusNewNoteTitleSignal: 0,
  linkEditorOpen: false,
  toasts: [],

  navigate: (screen) => {
    const { screenStack } = get();
    set({
      currentScreen: screen,
      screenStack: [...screenStack, screen],
      ...(screen === "settings" ? { focusMode: false } : {}),
    });
  },

  goBack: () => {
    const { screenStack, currentScreen } = get();
    if (currentScreen === "editor") {
      void scheduleLifecycleFlush({ syncBackup: true });
    }
    if (screenStack.length <= 1) return;
    const newStack = screenStack.slice(0, -1);
    set({
      currentScreen: newStack[newStack.length - 1],
      screenStack: newStack,
    });
  },

  returnToNoteList: () => {
    const { screenStack, currentScreen } = get();
    if (currentScreen === "editor") {
      void scheduleLifecycleFlush({ syncBackup: true });
    }
    const noteListIndex = screenStack.indexOf("noteList");
    const newStack =
      noteListIndex >= 0
        ? screenStack.slice(0, noteListIndex + 1)
        : (["noteList"] as Screen[]);
    set({
      currentScreen: "noteList",
      screenStack: newStack,
      sidebarVisible: false,
    });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  performSearch: async (query) => {
    if (!query.trim()) {
      set({ searchResults: [], isSearching: false });
      return;
    }
    set({ isSearching: true });
    const results = await noteStorage.search(query);
    set({ searchResults: results, isSearching: false });
  },

  clearSearch: () =>
    set({ searchQuery: "", searchResults: [], isSearching: false }),

  showSidebar: () => set({ sidebarVisible: true }),
  hideSidebar: () => set({ sidebarVisible: false }),
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),

  setFocusMode: (enabled) => {
    if (enabled && isMobileViewport()) return;
    set({ focusMode: enabled });
  },
  toggleFocusMode: () => {
    if (isMobileViewport()) return;
    set((s) => ({ focusMode: !s.focusMode }));
  },

  openNoteSearch: () => set({ focusMode: false, noteSearchOpen: true }),
  clearNoteSearchOpen: () => set({ noteSearchOpen: false }),
  requestFindInNote: (options) =>
    set((s) => ({
      findInNoteSignal: s.findInNoteSignal + 1,
      findInNoteReplaceMode: options?.replace ?? false,
    })),

  requestFocusNewNoteTitle: () =>
    set((s) => ({ focusNewNoteTitleSignal: s.focusNewNoteTitleSignal + 1 })),

  clearFocusNewNoteTitle: () => set({ focusNewNoteTitleSignal: 0 }),

  openLinkEditor: () => set({ linkEditorOpen: true }),
  closeLinkEditor: () => {
    clearLinkEditorSelection();
    set({ linkEditorOpen: false });
  },

  showToast: (message, type = "info") => {
    const id = Date.now().toString();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().dismissToast(id), 3000);
  },

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
