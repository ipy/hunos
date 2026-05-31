import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";
import { suppressWikiLinkSuggestionBriefly } from "./wikiLinkEditGuard";
import { shouldNavigateWikiLinkClick } from "./wikiLinkClickUtils";

const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;
const wikiLinkKey = new PluginKey("wikiLinkDecoration");

export const WIKI_LINK_TARGET_TESTID = "wiki-link-target";

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

export function buildWikiLinkDecorations(state: EditorState): DecorationSet {
  const { doc } = state;
  const wikiLinks = findWikiLinks(doc);
  const decorations: Decoration[] = [];

  for (const wl of wikiLinks) {
    decorations.push(
      Decoration.inline(wl.start, wl.contentStart, {
        class: "wiki-link-bracket-hidden",
      }),
      Decoration.inline(wl.contentStart, wl.contentEnd, {
        class: "wiki-link-content",
        "data-testid": WIKI_LINK_TARGET_TESTID,
        "data-wiki-title": wl.title,
        role: "link",
        tabindex: "-1",
        "aria-label": wl.title,
      }),
      Decoration.inline(wl.contentEnd, wl.end, {
        class: "wiki-link-bracket-hidden",
      }),
    );
  }

  return DecorationSet.create(doc, decorations);
}

function captureWikiLinkPreClick(
  view: EditorView,
  event: MouseEvent | PointerEvent,
  setPreClick: (from: number, span: { start: number; end: number }) => void,
  clearPreClick: () => void,
): void {
  const target = event.target as HTMLElement;
  const linkEl = target.closest(".wiki-link-content");
  if (!linkEl) {
    clearPreClick();
    return;
  }

  suppressWikiLinkSuggestionBriefly();

  const coords = view.posAtCoords({
    left: event.clientX,
    top: event.clientY,
  });
  if (!coords) {
    clearPreClick();
    return;
  }

  const wikiLinks = findWikiLinks(view.state.doc);
  const linkAtPos = wikiLinks.find(
    (wl) => coords.pos >= wl.start && coords.pos <= wl.end,
  );
  if (!linkAtPos) {
    clearPreClick();
    return;
  }

  setPreClick(view.state.selection.from, {
    start: linkAtPos.start,
    end: linkAtPos.end,
  });
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
        view(view) {
          const setPreClick = (
            from: number,
            span: { start: number; end: number },
          ) => {
            preClickSelectionFrom = from;
            preClickLinkSpan = span;
          };
          const clearPreClick = () => {
            preClickSelectionFrom = null;
            preClickLinkSpan = null;
          };

          const onPointerDownCapture = (event: PointerEvent) => {
            captureWikiLinkPreClick(view, event, setPreClick, clearPreClick);
          };

          view.dom.addEventListener("pointerdown", onPointerDownCapture, true);
          return {
            destroy() {
              view.dom.removeEventListener(
                "pointerdown",
                onPointerDownCapture,
                true,
              );
            },
          };
        },
        props: {
          decorations(state) {
            return buildWikiLinkDecorations(state);
          },
          handleDOMEvents: {
            mousedown(view, event) {
              captureWikiLinkPreClick(
                view,
                event,
                (from, span) => {
                  preClickSelectionFrom = from;
                  preClickLinkSpan = span;
                },
                () => {
                  preClickSelectionFrom = null;
                  preClickLinkSpan = null;
                },
              );
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
