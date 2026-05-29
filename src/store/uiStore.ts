import { create } from "zustand";
import type { Note } from "@/types/note";
import { noteStorage } from "@/storage/noteStorage";

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
  toasts: Toast[];

  navigate: (screen: Screen) => void;
  goBack: () => void;
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
    const { screenStack } = get();
    if (screenStack.length <= 1) return;
    const newStack = screenStack.slice(0, -1);
    set({
      currentScreen: newStack[newStack.length - 1],
      screenStack: newStack,
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

  setFocusMode: (enabled) => set({ focusMode: enabled }),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),

  openNoteSearch: () => set({ focusMode: false, noteSearchOpen: true }),
  clearNoteSearchOpen: () => set({ noteSearchOpen: false }),
  requestFindInNote: (options) =>
    set((s) => ({
      findInNoteSignal: s.findInNoteSignal + 1,
      findInNoteReplaceMode: options?.replace ?? false,
    })),

  showToast: (message, type = "info") => {
    const id = Date.now().toString();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().dismissToast(id), 3000);
  },

  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
