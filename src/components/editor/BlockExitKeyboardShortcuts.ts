import { Extension } from "@tiptap/core";
import { isEditorSuggestionMenuOpen } from "@/utils/editorSuggestionMenu";
import { isEditorFocusedForOutline } from "./listOutlineUtils";
import {
  shouldExitBlockquoteOnBackspace,
  shouldExitBlockquoteOnEnter,
} from "./blockExitKeyboardUtils";

/** Priority 248 — below ListKeyboardShortcuts (250) so list exit wins in nested lists. */
export const BlockExitKeyboardShortcuts = Extension.create({
  name: "blockExitKeyboardShortcuts",
  priority: 248,

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (!isEditorFocusedForOutline(this.editor)) {
          return false;
        }

        if (isEditorSuggestionMenuOpen()) {
          return false;
        }

        if (!shouldExitBlockquoteOnEnter(this.editor)) {
          return false;
        }

        return this.editor.commands.liftEmptyBlock();
      },
      Backspace: () => {
        if (!isEditorFocusedForOutline(this.editor)) {
          return false;
        }

        if (isEditorSuggestionMenuOpen()) {
          return false;
        }

        if (!shouldExitBlockquoteOnBackspace(this.editor)) {
          return false;
        }

        return this.editor.commands.liftEmptyBlock();
      },
    };
  },
});
