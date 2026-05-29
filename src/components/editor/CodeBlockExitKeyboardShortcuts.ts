import { Extension } from "@tiptap/core";
import { isEditorSuggestionMenuOpen } from "@/utils/editorSuggestionMenu";
import { isEditorFocusedForOutline } from "./listOutlineUtils";
import {
  shouldExitCodeBlockOnEnter,
  shouldExitCodeBlockOnModEnter,
} from "./blockExitKeyboardUtils";

/**
 * Priority 255 — below TableKeyboardShortcuts (260), above EditorKeyboardShortcuts
 * (200) so Mod+Enter adds table rows in cells and toggles tasks in task items.
 */
export const CodeBlockExitKeyboardShortcuts = Extension.create({
  name: "codeBlockExitKeyboardShortcuts",
  priority: 255,

  addKeyboardShortcuts() {
    const guard = () => {
      if (!isEditorFocusedForOutline(this.editor)) {
        return false;
      }
      if (isEditorSuggestionMenuOpen()) {
        return false;
      }
      return true;
    };

    return {
      "Mod-Enter": () => {
        if (!guard()) {
          return false;
        }

        if (!shouldExitCodeBlockOnModEnter(this.editor)) {
          return false;
        }

        return this.editor.commands.exitCode();
      },

      Enter: () => {
        if (!guard()) {
          return false;
        }

        if (!shouldExitCodeBlockOnEnter(this.editor)) {
          return false;
        }

        return this.editor.commands.exitCode();
      },
    };
  },
});
