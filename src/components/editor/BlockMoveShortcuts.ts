import { Extension } from "@tiptap/core";
import { isEditorSuggestionMenuOpen } from "@/utils/editorSuggestionMenu";
import { isEditorFocusedForOutline } from "./listOutlineUtils";
import {
  buildMoveBlockTransaction,
  type BlockMoveDirection,
} from "./blockMoveUtils";

export const BlockMoveShortcuts = Extension.create({
  name: "blockMoveShortcuts",
  priority: 240,

  addKeyboardShortcuts() {
    const handleMove = (direction: BlockMoveDirection) => {
      if (!isEditorFocusedForOutline(this.editor)) {
        return false;
      }

      if (isEditorSuggestionMenuOpen()) {
        return true;
      }

      const transaction = buildMoveBlockTransaction(
        this.editor.state,
        direction,
      );
      if (!transaction) {
        return false;
      }

      this.editor.view.dispatch(transaction);
      return true;
    };

    return {
      "Mod-Alt-ArrowUp": () => handleMove("up"),
      "Mod-Alt-ArrowDown": () => handleMove("down"),
    };
  },
});
