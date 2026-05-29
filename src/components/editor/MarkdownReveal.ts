import { Extension } from "@tiptap/core";
import type { Mark, Node } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { getMarkRevealSymbols } from "./markdownSymbols";

const markdownRevealKey = new PluginKey("markdownReveal");

export interface MarkdownRevealSymbolSpec {
  rangeStart: number;
  rangeEnd: number;
  open: string;
  close: string;
}

function expandMarkRange(
  parent: Node,
  blockStart: number,
  mark: Mark,
  markStart: number,
  markEnd: number,
): { rangeStart: number; rangeEnd: number } {
  let rangeStart = markStart;
  let rangeEnd = markEnd;

  parent.forEach((sibling, sibOffset) => {
    if (!sibling.isText) return;
    const sibAbsStart = blockStart + sibOffset;
    const sibAbsEnd = sibAbsStart + sibling.nodeSize;
    const hasMark = sibling.marks.some(
      (m) => m.type.name === mark.type.name && m.eq(mark),
    );
    if (hasMark) {
      if (sibAbsStart < rangeStart && sibAbsEnd >= rangeStart) {
        rangeStart = sibAbsStart;
      }
      if (sibAbsEnd > rangeEnd && sibAbsStart <= rangeEnd) {
        rangeEnd = sibAbsEnd;
      }
    }
  });

  return { rangeStart, rangeEnd };
}

export function collectMarkdownRevealSymbolSpecs(
  state: EditorState,
): MarkdownRevealSymbolSpec[] {
  const { selection, doc } = state;
  const { from } = selection;
  const specs: MarkdownRevealSymbolSpec[] = [];
  const $pos = doc.resolve(from);

  const parent = $pos.parent;
  if (!parent.isTextblock) return specs;

  const blockStart = $pos.start();

  parent.forEach((node, offset) => {
    if (!node.isText) return;
    const absStart = blockStart + offset;
    const absEnd = absStart + node.nodeSize;

    if (from < absStart || from > absEnd) return;

    node.marks.forEach((mark) => {
      const sym = getMarkRevealSymbols(mark.type.name, mark);
      if (!sym) return;

      const { rangeStart, rangeEnd } = expandMarkRange(
        parent,
        blockStart,
        mark,
        absStart,
        absEnd,
      );

      specs.push({
        rangeStart,
        rangeEnd,
        open: sym.open,
        close: sym.close,
      });
    });
  });

  return specs;
}

export function buildMarkdownRevealDecorations(
  state: EditorState,
): DecorationSet {
  const { doc } = state;
  const decorations: Decoration[] = [];

  for (const spec of collectMarkdownRevealSymbolSpecs(state)) {
    const openWidget = Decoration.widget(
      spec.rangeStart,
      () => {
        const span = document.createElement("span");
        span.textContent = spec.open;
        span.className = "md-reveal-symbol";
        return span;
      },
      { side: -1 },
    );

    const closeWidget = Decoration.widget(
      spec.rangeEnd,
      () => {
        const span = document.createElement("span");
        span.textContent = spec.close;
        span.className = "md-reveal-symbol";
        return span;
      },
      { side: 1 },
    );

    decorations.push(openWidget, closeWidget);
  }

  return DecorationSet.create(doc, decorations);
}

export const MarkdownReveal = Extension.create({
  name: "markdownReveal",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: markdownRevealKey,
        props: {
          decorations(state) {
            return buildMarkdownRevealDecorations(state);
          },
        },
      }),
    ];
  },
});
