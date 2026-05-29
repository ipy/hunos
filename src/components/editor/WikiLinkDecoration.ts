import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";
import { suppressWikiLinkSuggestionBriefly } from "./wikiLinkEditGuard";
import { shouldNavigateWikiLinkClick } from "./wikiLinkClickUtils";

const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;
const wikiLinkKey = new PluginKey("wikiLinkDecoration");

export interface WikiLinkDecorationOptions {
  onWikiLinkClick: (title: string) => void;
}

interface WikiLinkMatch {
  start: number;
  end: number;
  contentStart: number;
  contentEnd: number;
  title: string;
}

function findWikiLinks(doc: ProseMirrorNode): WikiLinkMatch[] {
  const matches: WikiLinkMatch[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;

    WIKI_LINK_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = WIKI_LINK_REGEX.exec(node.text)) !== null) {
      const start = pos + match.index;
      const end = start + match[0].length;
      matches.push({
        start,
        end,
        contentStart: start + 2,
        contentEnd: end - 2,
        title: match[1].trim(),
      });
    }
  });

  return matches;
}

function buildDecorations(state: EditorState): DecorationSet {
  const { doc, selection } = state;
  const cursorPos = selection.from;
  const wikiLinks = findWikiLinks(doc);
  const decorations: Decoration[] = [];

  for (const wl of wikiLinks) {
    const cursorInLabel =
      cursorPos >= wl.contentStart && cursorPos <= wl.contentEnd;
    const cursorOnBrackets =
      cursorPos >= wl.start &&
      cursorPos <= wl.end &&
      !cursorInLabel;

    if (cursorOnBrackets) {
      decorations.push(
        Decoration.inline(wl.start, wl.contentStart, {
          class: "wiki-link-bracket-visible",
        }),
        Decoration.inline(wl.contentStart, wl.contentEnd, {
          class: "wiki-link-content",
          "data-wiki-title": wl.title,
        }),
        Decoration.inline(wl.contentEnd, wl.end, {
          class: "wiki-link-bracket-visible",
        }),
      );
    } else {
      decorations.push(
        Decoration.inline(wl.start, wl.contentStart, {
          class: "wiki-link-bracket-hidden",
        }),
        Decoration.inline(wl.contentStart, wl.contentEnd, {
          class: "wiki-link-content",
          "data-wiki-title": wl.title,
        }),
        Decoration.inline(wl.contentEnd, wl.end, {
          class: "wiki-link-bracket-hidden",
        }),
      );
    }
  }

  return DecorationSet.create(doc, decorations);
}

export const WikiLinkDecoration = Extension.create<WikiLinkDecorationOptions>({
  name: "wikiLinkDecoration",

  addOptions() {
    return {
      onWikiLinkClick: () => {},
    };
  },

  addProseMirrorPlugins() {
    const { onWikiLinkClick } = this.options;

    let preClickSelectionFrom: number | null = null;
    let preClickLinkSpan: { start: number; end: number } | null = null;
    let navigationInFlight = false;

    return [
      new Plugin({
        key: wikiLinkKey,
        props: {
          decorations(state) {
            return buildDecorations(state);
          },
          handleDOMEvents: {
            mousedown(view, event) {
              const target = event.target as HTMLElement;
              const linkEl = target.closest(".wiki-link-content");
              if (!linkEl) {
                preClickSelectionFrom = null;
                preClickLinkSpan = null;
                return false;
              }

              suppressWikiLinkSuggestionBriefly();

              const coords = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              });
              if (!coords) {
                preClickSelectionFrom = null;
                preClickLinkSpan = null;
                return false;
              }

              const wikiLinks = findWikiLinks(view.state.doc);
              const linkAtPos = wikiLinks.find(
                (wl) => coords.pos >= wl.start && coords.pos <= wl.end,
              );
              if (!linkAtPos) {
                preClickSelectionFrom = null;
                preClickLinkSpan = null;
                return false;
              }

              preClickSelectionFrom = view.state.selection.from;
              preClickLinkSpan = {
                start: linkAtPos.start,
                end: linkAtPos.end,
              };
              return false;
            },
          },
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement;
            const linkEl = target.closest(".wiki-link-content");
            if (!linkEl) {
              preClickSelectionFrom = null;
              preClickLinkSpan = null;
              return false;
            }

            const title = linkEl.getAttribute("data-wiki-title");
            if (!title) return false;

            const wikiLinks = findWikiLinks(view.state.doc);
            const linkAtPos = wikiLinks.find(
              (wl) => pos >= wl.start && pos <= wl.end,
            );
            if (!linkAtPos) return false;

            const selectionFromBeforeClick =
              preClickLinkSpan?.start === linkAtPos.start &&
              preClickLinkSpan?.end === linkAtPos.end &&
              preClickSelectionFrom !== null
                ? preClickSelectionFrom
                : view.state.selection.from;

            preClickSelectionFrom = null;
            preClickLinkSpan = null;

            if (
              !shouldNavigateWikiLinkClick(selectionFromBeforeClick, linkAtPos)
            ) {
              return false;
            }

            if (navigationInFlight) return true;

            navigationInFlight = true;
            void Promise.resolve(onWikiLinkClick(title)).finally(() => {
              navigationInFlight = false;
            });
            return true;
          },
        },
      }),
    ];
  },
});
