import { Extension } from "@tiptap/core";
import { isEditorSuggestionMenuOpen } from "@/utils/editorSuggestionMenu";

function isNoteTitleFocused(): boolean {
  const active = document.activeElement;
  return (
    active instanceof HTMLElement && active.matches('[data-field="note-title"]')
  );
}

export const HistoryKeyboardShortcuts = Extension.create({
  name: "historyKeyboardShortcuts",
  priority: 260,

  addKeyboardShortcuts() {
    const handleUndo = () => {
      if (isNoteTitleFocused()) {
        return false;
      }
      if (isEditorSuggestionMenuOpen()) {
        return true;
      }
      return this.editor.commands.undo();
    };

    const handleRedo = () => {
      if (isNoteTitleFocused()) {
        return false;
      }
      if (isEditorSuggestionMenuOpen()) {
        return true;
      }
      return this.editor.commands.redo();
    };

    return {
      "Mod-z": handleUndo,
      "Mod-Shift-z": handleRedo,
      "Mod-y": handleRedo,
    };
  },
});
