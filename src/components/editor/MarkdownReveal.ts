import { Extension } from "@tiptap/core";
import type { Mark, Node } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { getMarkRevealSymbols } from "./markdownSymbols";
import {
  findCompleteWikiLinksInBlock,
  isInCodeContext,
} from "./wikiLinkSuggestionUtils";

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

function markRevealKey(mark: Mark): string {
  return `${mark.type.name}:${JSON.stringify(mark.attrs)}`;
}

function seedMarkRange(
  parent: Node,
  blockStart: number,
  mark: Mark,
): { rangeStart: number; rangeEnd: number } | null {
  let seedStart = 0;
  let seedEnd = 0;
  let found = false;

  parent.forEach((node, offset) => {
    if (!node.isText || found) return;
    const hasMark = node.marks.some((m) => m.eq(mark));
    if (!hasMark) return;

    seedStart = blockStart + offset;
    seedEnd = seedStart + node.nodeSize;
    found = true;
  });

  if (!found) return null;

  return expandMarkRange(parent, blockStart, mark, seedStart, seedEnd);
}

function collectWikiLinkRevealSymbolSpec(
  state: EditorState,
  from: number,
): MarkdownRevealSymbolSpec | null {
  const $pos = state.doc.resolve(from);
  if (isInCodeContext($pos)) return null;

  const blockStart = $pos.start();
  const blockEnd = $pos.end();
  const blockText = state.doc.textBetween(blockStart, blockEnd, "\n", "\n");

  const blockOffset = from - blockStart;
  for (const span of findCompleteWikiLinksInBlock(blockText)) {
    if (blockOffset < span.start || blockOffset >= span.end) continue;

    return {
      rangeStart: blockStart + span.start + 2,
      rangeEnd: blockStart + span.end - 2,
      open: "[[",
      close: "]]",
    };
  }

  return null;
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
  const seenMarks = new Set<string>();

  parent.forEach((node) => {
    if (!node.isText) return;

    node.marks.forEach((mark) => {
      const key = markRevealKey(mark);
      if (seenMarks.has(key)) return;

      const sym = getMarkRevealSymbols(mark.type.name, mark);
      if (!sym) return;

      const range = seedMarkRange(parent, blockStart, mark);
      if (!range) return;

      seenMarks.add(key);

      if (from < range.rangeStart || from > range.rangeEnd) return;

      specs.push({
        rangeStart: range.rangeStart,
        rangeEnd: range.rangeEnd,
        open: sym.open,
        close: sym.close,
      });
    });
  });

  const wikiSpec = collectWikiLinkRevealSymbolSpec(state, from);
  if (wikiSpec) {
    specs.push(wikiSpec);
  }

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
