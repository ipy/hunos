import { Extension, InputRule } from "@tiptap/core";
import {
  applyUnclosedSingleStarSpaceInputRule,
  tryTrimUnclosedSingleStarOnSpace,
  UNCLOSED_SINGLE_STAR_SPACE_INPUT_RE,
} from "./markdownStarDebrisUtils";

/** Strip dangling single-`*` openers before strike/italic input rules can mis-apply marks. */
export const MarkdownStarDebrisCleanup = Extension.create({
  name: "markdownStarDebrisCleanup",
  priority: 1200,

  addInputRules() {
    return [
      new InputRule({
        find: UNCLOSED_SINGLE_STAR_SPACE_INPUT_RE,
        handler: ({ state, range }) => {
          if (
            !applyUnclosedSingleStarSpaceInputRule({
              state,
              tr: state.tr,
              range,
            })
          ) {
            return null;
          }
          return null;
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      Space: () => tryTrimUnclosedSingleStarOnSpace(this.editor),
    };
  },
});
