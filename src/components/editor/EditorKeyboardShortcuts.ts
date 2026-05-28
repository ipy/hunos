import { Extension } from '@tiptap/core';
import { isEditorSuggestionMenuOpen } from '@/utils/editorSuggestionMenu';
import { promptAndSetLink } from './inlineFormatActions';

function suggestionMenuBlocksShortcut(): boolean {
  return isEditorSuggestionMenuOpen();
}

export const EditorKeyboardShortcuts = Extension.create({
  name: 'editorKeyboardShortcuts',
  priority: 200,

  addKeyboardShortcuts() {
    return {
      'Mod-b': () => {
        if (suggestionMenuBlocksShortcut()) return true;
        return this.editor.commands.toggleBold();
      },
      'Mod-i': () => {
        if (suggestionMenuBlocksShortcut()) return true;
        return this.editor.commands.toggleItalic();
      },
      'Mod-Shift-x': () => {
        if (suggestionMenuBlocksShortcut()) return true;
        return this.editor.commands.toggleStrike();
      },
      'Mod-k': () => {
        if (suggestionMenuBlocksShortcut()) return true;
        promptAndSetLink(this.editor);
        return true;
      },
      'Mod-Enter': () => {
        if (suggestionMenuBlocksShortcut()) return true;
        if (!this.editor.isActive('taskItem')) return false;
        const checked = Boolean(this.editor.getAttributes('taskItem').checked);
        return this.editor.commands.updateAttributes('taskItem', { checked: !checked });
      },
    };
  },
});
