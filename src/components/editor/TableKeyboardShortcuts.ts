import { Extension } from "@tiptap/core";
import {
  handleTableShiftTab,
  handleTableTab,
  isTableShortcutContext,
  shouldBlockTableShortcutForSuggestionMenu,
} from "./tableKeyboardUtils";

// Priority 260 beats ListOutlineShortcuts (250) so Tab navigates cells, not list indent.
export const TableKeyboardShortcuts = Extension.create({
  name: "tableKeyboardShortcuts",
  priority: 260,

  addKeyboardShortcuts() {
    return {
      Tab: () => handleTableTab(this.editor),
      "Shift-Tab": () => handleTableShiftTab(this.editor),
      "Mod-Enter": () => {
        if (!isTableShortcutContext(this.editor)) {
          return false;
        }
        if (shouldBlockTableShortcutForSuggestionMenu()) {
          return true;
        }
        return this.editor.commands.addRowAfter();
      },
      "Mod-Shift-Enter": () => {
        if (!isTableShortcutContext(this.editor)) {
          return false;
        }
        if (shouldBlockTableShortcutForSuggestionMenu()) {
          return true;
        }
        return this.editor.commands.addColumnAfter();
      },
      "Mod-Backspace": () => {
        if (!isTableShortcutContext(this.editor)) {
          return false;
        }
        if (shouldBlockTableShortcutForSuggestionMenu()) {
          return true;
        }
        return this.editor.commands.deleteRow();
      },
      "Mod-Shift-Backspace": () => {
        if (!isTableShortcutContext(this.editor)) {
          return false;
        }
        if (shouldBlockTableShortcutForSuggestionMenu()) {
          return true;
        }
        return this.editor.commands.deleteColumn();
      },
    };
  },
});
