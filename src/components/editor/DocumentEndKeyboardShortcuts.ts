import { Extension } from "@tiptap/core";
import { moveCaretToDocumentEnd } from "./documentEndKeyboardUtils";

export const DocumentEndKeyboardShortcuts = Extension.create({
  name: "documentEndKeyboardShortcuts",
  priority: 180,

  addKeyboardShortcuts() {
    return {
      "Mod-End": () => moveCaretToDocumentEnd(this.editor),
    };
  },
});
