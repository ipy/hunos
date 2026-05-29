import { Extension, InputRule } from "@tiptap/core";
import {
  applyPipeTableInputToTransaction,
  PIPE_TABLE_INPUT_REGEX,
} from "./markdownTableUtils";

export const MarkdownTableInput = Extension.create({
  name: "markdownTableInput",

  addInputRules() {
    return [
      new InputRule({
        find: PIPE_TABLE_INPUT_REGEX,
        handler: ({ state, range, match }) => {
          applyPipeTableInputToTransaction(state, state.tr, range, match);
        },
      }),
    ];
  },
});
