import { Extension } from "@tiptap/core";
import { combineTransactionSteps, getChangedRanges } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { isAutolinkRangeBlocked } from "./linkAutolinkUtils";

const linkAutolinkGuardsKey = new PluginKey("linkAutolinkGuards");

export const LinkAutolinkGuards = Extension.create({
  name: "linkAutolinkGuards",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: linkAutolinkGuardsKey,
        appendTransaction: (transactions, oldState, newState) => {
          const docChanged = transactions.some(
            (transaction) => transaction.docChanged,
          );
          if (!docChanged || oldState.doc.eq(newState.doc)) {
            return null;
          }

          const transform = combineTransactionSteps(oldState.doc, [
            ...transactions,
          ]);
          const changes = getChangedRanges(transform);
          const { tr } = newState;
          let modified = false;

          for (const { newRange } of changes) {
            newState.doc.nodesBetween(
              newRange.from,
              newRange.to,
              (node, pos) => {
                if (!node.isText || !node.text) {
                  return;
                }

                const linkMark = node.marks.find(
                  (mark) => mark.type.name === "link",
                );
                if (!linkMark) {
                  return;
                }

                const from = pos;
                const to = pos + node.text.length;
                if (isAutolinkRangeBlocked(newState, from, to)) {
                  tr.removeMark(from, to, linkMark.type);
                  modified = true;
                }
              },
            );
          }

          return modified ? tr : null;
        },
      }),
    ];
  },
});
