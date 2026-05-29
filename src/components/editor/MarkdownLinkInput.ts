import { Extension, InputRule } from "@tiptap/core";
import i18n from "@/i18n";
import { useUIStore } from "@/store/uiStore";
import { isValidLinkUrl } from "./inlineFormatActions";
import {
  applyMarkdownLinkInputToTransaction,
  MARKDOWN_LINK_INPUT_REGEX,
} from "./markdownLinkUtils";
import {
  tryApplyMarkdownLinkAtCursor,
  tryApplyMarkdownLinkOnSpace,
} from "./markdownLinkInputUtils";

export const MarkdownLinkInput = Extension.create({
  name: "markdownLinkInput",
  priority: 1000,

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
      Space: () => tryApplyMarkdownLinkOnSpace(this.editor),
      Enter: () => {
        if (!tryApplyMarkdownLinkAtCursor(this.editor)) {
          return false;
        }
        return this.editor.commands.splitBlock();
      },
    };
  },
});
