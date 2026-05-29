import { Extension } from "@tiptap/core";
import { isEditorSuggestionMenuOpen } from "@/utils/editorSuggestionMenu";
import { buildSelectAllTransaction } from "./selectAllScopeUtils";

export const SelectAllShortcuts = Extension.create({
  name: "selectAllShortcuts",
  priority: 270,

  addKeyboardShortcuts() {
    return {
      "Mod-a": () => {
        if (isEditorSuggestionMenuOpen()) {
          return true;
        }

        const transaction = buildSelectAllTransaction(this.editor.state);
        if (!transaction) {
          return true;
        }

        this.editor.view.dispatch(transaction);
        return true;
      },
    };
  },
});
