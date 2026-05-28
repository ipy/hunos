import { Extension } from "@tiptap/core";
import { isEditorSuggestionMenuOpen } from "@/utils/editorSuggestionMenu";
import {
  getOutlineListItemType,
  isEditorFocusedForOutline,
  shouldDeferTabToSuggestionMenu,
} from "./listOutlineUtils";

export const ListOutlineShortcuts = Extension.create({
  name: "listOutlineShortcuts",
  priority: 250,

  addKeyboardShortcuts() {
    const handleTab = (sink: boolean) => {
      if (!isEditorFocusedForOutline(this.editor)) {
        return false;
      }

      if (shouldDeferTabToSuggestionMenu(sink, isEditorSuggestionMenuOpen())) {
        return false;
      }

      if (isEditorSuggestionMenuOpen()) {
        return true;
      }

      const listItemType = getOutlineListItemType(this.editor);
      if (!listItemType) {
        return false;
      }

      const command = sink
        ? this.editor.commands.sinkListItem(listItemType)
        : this.editor.commands.liftListItem(listItemType);

      return command;
    };

    return {
      Tab: () => handleTab(true),
      "Shift-Tab": () => handleTab(false),
    };
  },
});
