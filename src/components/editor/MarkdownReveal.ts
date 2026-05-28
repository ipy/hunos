import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { MARK_SYMBOLS } from './markdownSymbols';

const markdownRevealKey = new PluginKey('markdownReveal');

export const MarkdownReveal = Extension.create({
  name: 'markdownReveal',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: markdownRevealKey,
        props: {
          decorations(state) {
            const { selection, doc } = state;
            const { from } = selection;
            const decorations: Decoration[] = [];
            const $pos = doc.resolve(from);

            const parent = $pos.parent;
            if (!parent.isTextblock) return DecorationSet.empty;

            parent.forEach((node, offset) => {
              if (!node.isText) return;
              const absStart = $pos.start() + offset;
              const absEnd = absStart + node.nodeSize;

              if (from < absStart || from > absEnd) return;

              node.marks.forEach(mark => {
                const sym = MARK_SYMBOLS[mark.type.name];
                if (!sym) return;

                const markStart = absStart;
                const markEnd = absEnd;

                let rangeStart = markStart;
                let rangeEnd = markEnd;

                parent.forEach((sibling, sibOffset) => {
                  if (!sibling.isText) return;
                  const sibAbsStart = $pos.start() + sibOffset;
                  const sibAbsEnd = sibAbsStart + sibling.nodeSize;
                  const hasMark = sibling.marks.some(m => m.type.name === mark.type.name && m.eq(mark));
                  if (hasMark) {
                    if (sibAbsStart < rangeStart && sibAbsEnd >= rangeStart) {
                      rangeStart = sibAbsStart;
                    }
                    if (sibAbsEnd > rangeEnd && sibAbsStart <= rangeEnd) {
                      rangeEnd = sibAbsEnd;
                    }
                  }
                });

                const openWidget = Decoration.widget(rangeStart, () => {
                  const span = document.createElement('span');
                  span.textContent = sym.open;
                  span.className = 'md-reveal-symbol';
                  return span;
                }, { side: -1 });

                const closeWidget = Decoration.widget(rangeEnd, () => {
                  const span = document.createElement('span');
                  span.textContent = sym.close;
                  span.className = 'md-reveal-symbol';
                  return span;
                }, { side: 1 });

                decorations.push(openWidget, closeWidget);
              });
            });

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
