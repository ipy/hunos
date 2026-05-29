import { Extension } from "@tiptap/core";
import {
  handleTableShiftTab,
  handleTableTab,
  isTableShortcutContext,
  shouldBlockTableShortcutForSuggestionMenu,
} from "./tableKeyboardUtils";

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
