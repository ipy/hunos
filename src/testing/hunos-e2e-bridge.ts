import type { Editor } from "@tiptap/react";
import { useNoteStore } from "@/store/noteStore";
import { useTagStore } from "@/store/tagStore";
import { useUIStore } from "@/store/uiStore";

let e2eEditor: Editor | null = null;

export function registerHunosE2eEditor(editor: Editor | null): void {
  e2eEditor = editor;
}

/** Playwright Harmony/WebView E2E — set when building with HUNOS_E2E=1. */
export function mountHunosE2eBridge(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    __hunosE2e?: {
      createNote: () => Promise<unknown>;
      goToNoteList: () => void;
      clearTagFilter: () => void;
      openNote: (id: string) => Promise<void>;
      insertHeadingAtEnd: (level: 1 | 2 | 3, text: string) => boolean;
      editorUndo: () => boolean;
      requestFindInNote: (replace?: boolean) => void;
    };
  };
  w.__hunosE2e = {
    createNote: async () => {
      const note = await useNoteStore.getState().createNote();
      await useNoteStore.getState().setActiveNote(note.id);
      useUIStore.getState().navigate("editor");
      useUIStore.getState().requestFocusNewNoteTitle();
      return note;
    },
    goToNoteList: () => useUIStore.getState().navigate("noteList"),
    clearTagFilter: () => {
      useTagStore.getState().setActiveTag(null);
      void useNoteStore.getState().loadNotes({ status: "active" });
      useUIStore.getState().navigate("noteList");
    },
    openNote: async (id: string) => {
      await useNoteStore.getState().setActiveNote(id);
      useUIStore.getState().navigate("editor");
    },
    insertHeadingAtEnd: (level, text) => {
      if (!e2eEditor) return false;
      e2eEditor
        .chain()
        .focus("end")
        .insertContent([
          { type: "paragraph" },
          {
            type: "heading",
            attrs: { level },
            content: [{ type: "text", text }],
          },
        ])
        .run();
      return true;
    },
    editorUndo: () => {
      if (!e2eEditor) return false;
      return e2eEditor.chain().focus().undo().run();
    },
    requestFindInNote: (replace?: boolean) =>
      useUIStore
        .getState()
        .requestFindInNote(replace ? { replace: true } : undefined),
  };
}
