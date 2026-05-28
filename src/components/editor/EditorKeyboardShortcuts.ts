import { Extension } from '@tiptap/core';
import i18n from '@/i18n';
import { useUIStore } from '@/store/uiStore';
import { isEditorSuggestionMenuOpen } from '@/utils/tocNavigation';

function suggestionMenuBlocksShortcut(): boolean {
  return isEditorSuggestionMenuOpen();
}

function isValidLinkUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    return Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function normalizeLinkUrl(url: string): string {
  const trimmed = url.trim();
  return trimmed.includes('://') ? trimmed : `https://${trimmed}`;
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

        const previousUrl = this.editor.getAttributes('link').href ?? '';
        const url = window.prompt(
          i18n.t('editor.link.prompt'),
          typeof previousUrl === 'string' ? previousUrl : '',
        );

        if (url === null) return true;

        const trimmed = url.trim();
        if (!trimmed) {
          return this.editor.chain().focus().extendMarkRange('link').unsetLink().run();
        }

        if (!isValidLinkUrl(trimmed)) {
          useUIStore.getState().showToast(i18n.t('editor.link.invalidUrl'), 'error');
          return true;
        }

        return this.editor
          .chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: normalizeLinkUrl(trimmed) })
          .run();
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
