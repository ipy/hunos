import type { Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import {
  isEditorSuggestionMenuOpen,
  isLinkEditorOpen,
} from "@/utils/editorSuggestionMenu";

export function documentEndShortcutBlocked(): boolean {
  return isEditorSuggestionMenuOpen() || isLinkEditorOpen();
}

/** Move the caret to the last editable position in the document. */
export function moveCaretToDocumentEnd(editor: Editor): boolean {
  if (documentEndShortcutBlocked()) {
    return true;
  }

  const { doc } = editor.state;
  const endSelection = TextSelection.atEnd(doc);
  return editor
    .chain()
    .focus()
    .setTextSelection(endSelection)
    .scrollIntoView()
    .run();
}
