import { Extension } from "@tiptap/core";
import { isEditorSuggestionMenuOpen } from "@/utils/editorSuggestionMenu";
import {
  getOutlineListItemType,
  isEditorFocusedForOutline,
} from "./listOutlineUtils";
import {
  applyListKeyboardAction,
  resolveBackspaceStartAction,
  resolveEmptyEnterAction,
} from "./listKeyboardUtils";

export const ListKeyboardShortcuts = Extension.create({
  name: "listKeyboardShortcuts",
  priority: 250,

  addKeyboardShortcuts() {
    const handleEnter = () => {
      if (!isEditorFocusedForOutline(this.editor)) {
        return false;
      }

      if (isEditorSuggestionMenuOpen()) {
        return false;
      }

      const action = resolveEmptyEnterAction(this.editor);
      if (!action) {
        return false;
      }

      const itemType = getOutlineListItemType(this.editor);
      if (!itemType) {
        return false;
      }

      return applyListKeyboardAction(this.editor, itemType);
    };

    const handleBackspace = () => {
      if (!isEditorFocusedForOutline(this.editor)) {
        return false;
      }

      if (isEditorSuggestionMenuOpen()) {
        return false;
      }

      const action = resolveBackspaceStartAction(this.editor);
      if (!action) {
        return false;
      }

      const itemType = getOutlineListItemType(this.editor);
      if (!itemType) {
        return false;
      }

      return applyListKeyboardAction(this.editor, itemType);
    };

    return {
      Enter: handleEnter,
      Backspace: handleBackspace,
    };
  },
});
