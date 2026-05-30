import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";
import { TAG_DECORATION_REGEX } from "@/utils/tagPattern";
import { shouldNavigateWikiLinkClick } from "./wikiLinkClickUtils";

const tagDecorationKey = new PluginKey("tagDecoration");

export interface TagDecorationOptions {
  onTagClick: (tagName: string) => void;
}

interface TagMatch {
  start: number;
  end: number;
  hashEnd: number;
  name: string;
}

function findTags(doc: ProseMirrorNode): TagMatch[] {
  const matches: TagMatch[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;

    TAG_DECORATION_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TAG_DECORATION_REGEX.exec(node.text)) !== null) {
      const fullMatch = match[0];
      const hashOffset = fullMatch.indexOf("#");
      const start = pos + match.index + hashOffset;
      const end = start + 1 + match[1].length;
      matches.push({
        start,
        end,
        hashEnd: start + 1,
        name: match[1],
      });
    }
  });

  return matches;
}

function buildDecorations(state: EditorState): DecorationSet {
  const { doc, selection } = state;
  const cursorPos = selection.from;
  const tags = findTags(doc);
  const decorations: Decoration[] = [];

  for (const tag of tags) {
    const cursorInside = cursorPos >= tag.start && cursorPos <= tag.end;

    if (cursorInside) {
      decorations.push(
        Decoration.inline(tag.start, tag.end, {
          class: "editor-tag editor-tag-active",
          "data-tag-name": tag.name,
        }),
      );
    } else {
      decorations.push(
        Decoration.inline(tag.start, tag.hashEnd, {
          class: "editor-tag-hash",
        }),
        Decoration.inline(tag.hashEnd, tag.end, {
          class: "editor-tag",
          "data-tag-name": tag.name,
        }),
      );
    }
  }

  return DecorationSet.create(doc, decorations);
}

export const TagDecoration = Extension.create<TagDecorationOptions>({
  name: "tagDecoration",

  addOptions() {
    return {
      onTagClick: () => {},
    };
  },

  addProseMirrorPlugins() {
    const { onTagClick } = this.options;

    let preClickSelectionFrom: number | null = null;
    let preClickTagSpan: { start: number; end: number } | null = null;
    let filterInFlight = false;

    return [
      new Plugin({
        key: tagDecorationKey,
        props: {
          decorations(state) {
            return buildDecorations(state);
          },
          handleDOMEvents: {
            mousedown(view, event) {
              const target = event.target as HTMLElement;
              const tagEl = target.closest(".editor-tag");
              if (!tagEl) {
                preClickSelectionFrom = null;
                preClickTagSpan = null;
                return false;
              }

              const coords = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (!coords) {
                preClickSelectionFrom = null;
                preClickTagSpan = null;
                return false;
              }

              const tags = findTags(view.state.doc);
              const tagAtPos = tags.find(
                (tag) => coords.pos >= tag.start && coords.pos <= tag.end,
              );
              if (!tagAtPos) {
                preClickSelectionFrom = null;
                preClickTagSpan = null;
                return false;
              }

              preClickSelectionFrom = view.state.selection.from;
              preClickTagSpan = {
                start: tagAtPos.start,
                end: tagAtPos.end,
              };
              return false;
            },
          },
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement;
            const tagEl = target.closest(".editor-tag");
            if (!tagEl) {
              preClickSelectionFrom = null;
              preClickTagSpan = null;
              return false;
            }

            const tagName = tagEl.getAttribute("data-tag-name");
            if (!tagName) return false;

            const tags = findTags(view.state.doc);
            const tagAtPos = tags.find(
              (tag) => pos >= tag.start && pos <= tag.end,
            );
            if (!tagAtPos) return false;

            const selectionFromBeforeClick =
              preClickTagSpan?.start === tagAtPos.start &&
              preClickTagSpan?.end === tagAtPos.end &&
              preClickSelectionFrom !== null
                ? preClickSelectionFrom
                : view.state.selection.from;

            preClickSelectionFrom = null;
            preClickTagSpan = null;

            if (
              !shouldNavigateWikiLinkClick(selectionFromBeforeClick, tagAtPos)
            ) {
              return false;
            }

            if (filterInFlight) return true;

            filterInFlight = true;
            void Promise.resolve(onTagClick(tagName)).finally(() => {
              filterInFlight = false;
            });
            return true;
          },
        },
      }),
    ];
  },
});
