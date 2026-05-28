import { Extension } from '@tiptap/core';
import { useUIStore } from '@/store/uiStore';
import { shouldSuppressFocusModeEscape } from '@/utils/editorSuggestionMenu';

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
        if (shouldSuppressFocusModeEscape()) return true;
        setFocusMode(false);
        return true;
      },
    };
  },
});
