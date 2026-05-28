import { Extension } from "@tiptap/core";
import { isEditorSuggestionMenuOpen } from "@/utils/editorSuggestionMenu";
import { isEditorFocusedForOutline } from "./listOutlineUtils";
import {
  buildDeleteLineTransaction,
  buildDuplicateLineTransaction,
} from "./blockLineUtils";

export const BlockLineShortcuts = Extension.create({
  name: "blockLineShortcuts",
  priority: 240,

  addKeyboardShortcuts() {
    const handleDuplicate = () => {
      if (!isEditorFocusedForOutline(this.editor)) {
        return false;
      }

      if (isEditorSuggestionMenuOpen()) {
        return true;
      }

      const transaction = buildDuplicateLineTransaction(this.editor.state);
      if (!transaction) {
        return false;
      }

      this.editor.view.dispatch(transaction);
      return true;
    };

    const handleDelete = () => {
      if (!isEditorFocusedForOutline(this.editor)) {
        return false;
      }

      if (isEditorSuggestionMenuOpen()) {
        return true;
      }

      const transaction = buildDeleteLineTransaction(this.editor.state);
      if (!transaction) {
        return false;
      }

      this.editor.view.dispatch(transaction);
      return true;
    };

    return {
      "Mod-d": handleDuplicate,
      "Mod-Shift-k": handleDelete,
    };
  },
});
