import { Extension, InputRule } from "@tiptap/core";
import i18n from "@/i18n";
import { useUIStore } from "@/store/uiStore";
import { isValidLinkUrl } from "./inlineFormatActions";
import {
  applyMarkdownLinkInputToTransaction,
  findMarkdownLinkInputMatch,
  MARKDOWN_LINK_INPUT_REGEX,
} from "./markdownLinkUtils";

function tryApplyMarkdownLinkAtCursor(editor: {
  state: import("@tiptap/pm/state").EditorState;
  view: { dispatch: (tr: import("@tiptap/pm/state").Transaction) => void };
}): boolean {
  const { state } = editor;
  const { $from } = state.selection;
  if (!$from.parent.isTextblock || !state.selection.empty) {
    return false;
  }

  const textBefore = $from.parent.textBetween(
    0,
    $from.parentOffset,
    undefined,
    "\0",
  );
  const match = findMarkdownLinkInputMatch(textBefore);
  if (!match) {
    return false;
  }

  const range = {
    from: $from.start() + textBefore.length - match[0].length,
    to: $from.pos,
  };

  if (!isValidLinkUrl(match[2])) {
    useUIStore.getState().showToast(i18n.t("editor.link.invalidUrl"), "error");
    return false;
  }

  const tr = state.tr;
  if (!applyMarkdownLinkInputToTransaction(state, tr, range, match)) {
    return false;
  }

  editor.view.dispatch(tr);
  return true;
}

export const MarkdownLinkInput = Extension.create({
  name: "markdownLinkInput",

  addInputRules() {
    return [
      new InputRule({
        find: MARKDOWN_LINK_INPUT_REGEX,
        handler: ({ state, range, match }) => {
          if (!isValidLinkUrl(match[2])) {
            useUIStore
              .getState()
              .showToast(i18n.t("editor.link.invalidUrl"), "error");
            return null;
          }

          const tr = state.tr;
          if (!applyMarkdownLinkInputToTransaction(state, tr, range, match)) {
            return null;
          }
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (!tryApplyMarkdownLinkAtCursor(this.editor)) {
          return false;
        }
        return this.editor.commands.splitBlock();
      },
    };
  },
});
