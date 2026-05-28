import { Extension } from '@tiptap/core';
import { useUIStore } from '@/store/uiStore';
import {
  isEditorSuggestionMenuOpen,
  shouldSuppressFocusModeExitAfterMenuClose,
} from '@/utils/editorSuggestionMenu';
import { collapseEditorSelection } from '@/utils/editorSelection';

export const FocusModeShortcuts = Extension.create({
  name: 'focusModeShortcuts',

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-f': () => {
        useUIStore.getState().toggleFocusMode();
        return true;
      },
      Escape: () => {
        const { focusMode, setFocusMode } = useUIStore.getState();
        if (!focusMode) return false;
        if (isEditorSuggestionMenuOpen()) return false;
        if (shouldSuppressFocusModeExitAfterMenuClose()) return true;
        if (!this.editor.state.selection.empty) {
          return collapseEditorSelection(this.editor);
        }
        setFocusMode(false);
        return true;
      },
    };
  },
});
