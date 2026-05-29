import { Extension, InputRule } from "@tiptap/core";
import {
  createTableWithHeaderRow,
  findPipeTableInputMatch,
  isBlockedForTableInput,
  isTableSeparatorRow,
  parsePipeTableRow,
  setSelectionInTableCell,
} from "./markdownTableUtils";

export const MarkdownTableInput = Extension.create({
  name: "markdownTableInput",

  addInputRules() {
    return [
      new InputRule({
        find: (text) => {
          const match = findPipeTableInputMatch(text);
          if (!match) {
            return null;
          }
          return { index: match.index, text: match[0] };
        },
        handler: ({ state, range, match }) => {
          const rawLine = match[1] as string;
          const cells = parsePipeTableRow(rawLine);
          if (!cells) {
            return null;
          }

          const $from = state.doc.resolve(range.from);
          if (isBlockedForTableInput($from)) {
            return null;
          }

          const { schema } = state;
          const tr = state.tr;
          const blockDepth = $from.depth;
          const blockStart = $from.before(blockDepth);
          const blockEnd = $from.after(blockDepth);
          const blockIndex = $from.index(blockDepth - 1);
          const parent = $from.node(blockDepth - 1);
          const isSeparator = isTableSeparatorRow(cells);

          if (isSeparator) {
            if (blockIndex > 0) {
              const prev = parent.child(blockIndex - 1);
              if (prev.type.name === "paragraph") {
                const prevCells = parsePipeTableRow(prev.textContent);
                if (prevCells && !isTableSeparatorRow(prevCells)) {
                  const prevStart = blockStart - prev.nodeSize;
                  const table = createTableWithHeaderRow(schema, prevCells);
                  tr.replaceWith(prevStart, blockEnd, table);
                  setSelectionInTableCell(tr, prevStart, 1, 0);
                  return;
                }
              }
              if (prev.type.name === "table") {
                tr.delete(blockStart, blockEnd);
                return;
              }
            }
            return null;
          }

          const table = createTableWithHeaderRow(schema, cells);
          tr.replaceWith(blockStart, blockEnd, table);
          setSelectionInTableCell(tr, blockStart, 1, 0);
        },
      }),
    ];
  },
});
