import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { marked } from "marked";
import { getImageFileFromClipboard } from "./imageEmbedUtils";
import {
  createTableFromPipeTable,
  isBlockedForTableInput,
  parsePipeTableText,
  setSelectionInTableCell,
} from "./markdownTableUtils";

function markdownToHtml(text: string): string {
  const preprocessed = text.replace(/==([^=\n]+?)==/g, "<mark>$1</mark>");
  return marked.parse(preprocessed, {
    async: false,
    breaks: true,
    gfm: true,
  }) as string;
}

export const MarkdownPaste = Extension.create({
  name: "markdownPaste",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const clipboard = event.clipboardData;
            if (!clipboard) return false;

            if (getImageFileFromClipboard(clipboard)) return false;

            const html = clipboard.getData("text/html");
            if (html && html.trim().length > 0) return false;

            const text = clipboard.getData("text/plain");
            if (!text) return false;

            const parsedTable = parsePipeTableText(text);
            if (parsedTable) {
              const { state, dispatch } = editor.view;
              const { from, to } = state.selection;
              if (!isBlockedForTableInput(state.doc.resolve(from))) {
                event.preventDefault();
                const table = createTableFromPipeTable(
                  state.schema,
                  parsedTable,
                );
                const tr = state.tr.replaceWith(from, to, table);
                setSelectionInTableCell(tr, from, 1, 0);
                dispatch(tr);
                return true;
              }
            }

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
