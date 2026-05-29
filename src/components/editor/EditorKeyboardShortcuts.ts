import { Extension } from "@tiptap/core";
import {
  isEditorSuggestionMenuOpen,
  isLinkEditorOpen,
} from "@/utils/editorSuggestionMenu";
import { openLinkEditor } from "./inlineFormatActions";

function shortcutBlocked(): boolean {
  return isEditorSuggestionMenuOpen() || isLinkEditorOpen();
}

export const EditorKeyboardShortcuts = Extension.create({
  name: "editorKeyboardShortcuts",
  priority: 200,

  addKeyboardShortcuts() {
    return {
      "Mod-b": () => {
        if (shortcutBlocked()) return true;
        return this.editor.commands.toggleBold();
      },
      "Mod-i": () => {
        if (shortcutBlocked()) return true;
        return this.editor.commands.toggleItalic();
      },
      "Mod-Shift-x": () => {
        if (shortcutBlocked()) return true;
        return this.editor.commands.toggleStrike();
      },
      "Mod-k": () => {
        if (shortcutBlocked()) return true;
        openLinkEditor(this.editor);
        return true;
      },
      "Mod-Enter": () => {
        if (shortcutBlocked()) return true;
        if (!this.editor.isActive("taskItem")) return false;
        return this.editor.commands.toggleTaskItemWithReorder();
      },
    };
  },
});
