import { Extension } from "@tiptap/core";
import { isEditorSuggestionMenuOpen } from "@/utils/editorSuggestionMenu";
import { insertParagraphBetweenHeadingAndList } from "./headingListBoundaryUtils";

/** Enter at the end of a heading before a list inserts a gap paragraph (UX-EDIT-01). */
export const HeadingListBoundaryShortcuts = Extension.create({
  name: "headingListBoundaryShortcuts",
  priority: 260,

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (isEditorSuggestionMenuOpen()) {
          return false;
        }
        return insertParagraphBetweenHeadingAndList(this.editor);
      },
    };
  },
});
