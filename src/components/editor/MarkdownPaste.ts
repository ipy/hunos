import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { marked } from 'marked';

function markdownToHtml(text: string): string {
  const preprocessed = text.replace(/==([^=\n]+?)==/g, '<mark>$1</mark>');
  return marked.parse(preprocessed, { async: false, breaks: true, gfm: true }) as string;
}

export const MarkdownPaste = Extension.create({
  name: 'markdownPaste',

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const clipboard = event.clipboardData;
            if (!clipboard) return false;

            const html = clipboard.getData('text/html');
            if (html && html.trim().length > 0) return false;

            const text = clipboard.getData('text/plain');
            if (!text) return false;

            event.preventDefault();
            const parsed = markdownToHtml(text);
            editor.commands.insertContent(parsed);
            return true;
          },
        },
      }),
    ];
  },
});
