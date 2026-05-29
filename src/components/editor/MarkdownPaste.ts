import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { marked } from "marked";
import { getImageFileFromClipboard } from "./imageEmbedUtils";
import {
  createTableFromPipeTable,
  setSelectionInTableCell,
} from "./markdownTableUtils";
import { resolveMarkdownPasteAction } from "./markdownPasteUtils";

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

            const { state, dispatch } = editor.view;
            const { from, to } = state.selection;
            const action = resolveMarkdownPasteAction(
              text,
              state.doc.resolve(from),
            );

            if (action.kind === "plain") {
              event.preventDefault();
              dispatch(state.tr.insertText(text, from, to));
              return true;
            }

            if (action.kind === "table") {
              event.preventDefault();
              const table = createTableFromPipeTable(
                state.schema,
                action.parsed,
              );
              const tr = state.tr.replaceWith(from, to, table);
              setSelectionInTableCell(tr, from, 1, 0);
              dispatch(tr);
              return true;
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
