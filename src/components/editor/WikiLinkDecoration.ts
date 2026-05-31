import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { EditorView } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";
import { suppressWikiLinkSuggestionBriefly } from "./wikiLinkEditGuard";
import { shouldNavigateWikiLinkClick } from "./wikiLinkClickUtils";
import {
  findEditorScrollContainer,
  wikiLinkMatchAtScrollMappedPointer,
} from "./wikiLinkPointerUtils";

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

export function findWikiLinks(doc: ProseMirrorNode): WikiLinkMatch[] {
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

export function findWikiLinkByTitle(
  doc: ProseMirrorNode,
  title: string,
): WikiLinkMatch | undefined {
  return findWikiLinks(doc).find((wl) => wl.title === title);
}

function wikiLinkMatchAtCoords(
  view: EditorView,
  event: MouseEvent | PointerEvent,
): WikiLinkMatch | null {
  const coords = view.posAtCoords({
    left: event.clientX,
    top: event.clientY,
  });
  if (!coords) return null;

  return (
    findWikiLinks(view.state.doc).find(
      (wl) => coords.pos >= wl.start && coords.pos <= wl.end,
    ) ?? null
  );
}

export function findWikiLinkContentInEventPath(
  event: Event,
): HTMLElement | null {
  const path = event.composedPath();
  for (const node of path) {
    if (
      node instanceof HTMLElement &&
      node.classList.contains("wiki-link-content")
    ) {
      return node;
    }
  }

  const target = event.target;
  if (target instanceof HTMLElement) {
    return target.closest(".wiki-link-content");
  }

  return null;
}

function wikiLinkMatchAtPos(
  doc: ProseMirrorNode,
  pos: number,
): WikiLinkMatch | null {
  return (
    findWikiLinks(doc).find(
      (wl) => pos >= wl.contentStart && pos <= wl.contentEnd,
    ) ?? null
  );
}

/** Programmatically open a wiki-link target (works when decoration bbox is 0×0). */
export function activateWikiLinkByTitle(
  view: EditorView,
  title: string,
  onWikiLinkClick: (title: string) => void,
): boolean {
  const match = findWikiLinkByTitle(view.state.doc, title);
  if (!match) return false;
  void Promise.resolve(onWikiLinkClick(match.title));
  return true;
}

/** Resolve the document span for a `.wiki-link-content` decoration target. */
export function wikiLinkMatchFromDomTarget(
  view: EditorView,
  linkEl: Element,
  event?: MouseEvent | PointerEvent,
): WikiLinkMatch | null {
  const title = linkEl.getAttribute("data-wiki-title");
  if (title) {
    const byTitle = findWikiLinkByTitle(view.state.doc, title);
    if (byTitle) return byTitle;
  }

  if (event) {
    return wikiLinkMatchAtCoords(view, event);
  }

  return null;
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
        nodeName: "a",
        class: "wiki-link-content",
        href: "#",
        "data-testid": WIKI_LINK_TARGET_TESTID,
        "data-wiki-title": wl.title,
        role: "link",
        tabindex: "0",
        "aria-label": wl.title,
      }),
      Decoration.inline(wl.contentEnd, wl.end, {
        class: "wiki-link-bracket-hidden",
      }),
    );
  }

  return DecorationSet.create(doc, decorations);
}

function resolveWikiLinkFromPointerEvent(
  view: EditorView,
  event: MouseEvent | PointerEvent,
): { linkEl: HTMLElement | null; linkAtPos: WikiLinkMatch | null } {
  const linkEl = findWikiLinkContentInEventPath(event);
  if (linkEl) {
    return {
      linkEl,
      linkAtPos: wikiLinkMatchFromDomTarget(view, linkEl, event),
    };
  }

  const links = findWikiLinks(view.state.doc);
  const mapped = wikiLinkMatchAtScrollMappedPointer(view, event, links);
  return { linkEl: null, linkAtPos: mapped };
}

function captureWikiLinkPreClick(
  view: EditorView,
  event: MouseEvent | PointerEvent,
  setPreClick: (from: number, span: { start: number; end: number }) => void,
  clearPreClick: () => void,
): void {
  const { linkAtPos } = resolveWikiLinkFromPointerEvent(view, event);
  if (!linkAtPos) {
    clearPreClick();
    return;
  }

  suppressWikiLinkSuggestionBriefly();

  setPreClick(view.state.selection.from, {
    start: linkAtPos.start,
    end: linkAtPos.end,
  });
}

function navigateWikiLinkFromTarget(
  view: EditorView,
  linkEl: Element | null,
  event: MouseEvent | PointerEvent | KeyboardEvent,
  selectionFromBeforeInteraction: number,
  onWikiLinkClick: (title: string) => void,
  navigationInFlight: { current: boolean },
  linkAtPosOverride?: WikiLinkMatch | null,
): boolean {
  const linkAtPos =
    linkAtPosOverride ??
    (linkEl
      ? wikiLinkMatchFromDomTarget(
          view,
          linkEl,
          event instanceof KeyboardEvent ? undefined : event,
        )
      : null);
  if (!linkAtPos) return false;

  const navigateOnKeyboard =
    event instanceof KeyboardEvent &&
    (event.key === "Enter" || event.key === " ");

  if (
    !navigateOnKeyboard &&
    !shouldNavigateWikiLinkClick(selectionFromBeforeInteraction, linkAtPos)
  ) {
    return false;
  }

  if (navigationInFlight.current) return true;

  navigationInFlight.current = true;
  void Promise.resolve(onWikiLinkClick(linkAtPos.title)).finally(() => {
    navigationInFlight.current = false;
  });
  return true;
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
    const navigationInFlight = { current: false };

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

          const onClickCapture = (event: MouseEvent) => {
            const { linkEl, linkAtPos } = resolveWikiLinkFromPointerEvent(
              view,
              event,
            );
            if (!linkAtPos) return;

            event.preventDefault();

            const selectionFromBeforeClick =
              preClickLinkSpan?.start === linkAtPos.start &&
              preClickLinkSpan?.end === linkAtPos.end &&
              preClickSelectionFrom !== null
                ? preClickSelectionFrom
                : view.state.selection.from;

            preClickSelectionFrom = null;
            preClickLinkSpan = null;

            const handled = navigateWikiLinkFromTarget(
              view,
              linkEl,
              event,
              selectionFromBeforeClick,
              onWikiLinkClick,
              navigationInFlight,
              linkAtPos,
            );
            if (handled) {
              event.preventDefault();
              event.stopPropagation();
            }
          };

          const scrollRoot =
            findEditorScrollContainer(view.dom) ?? view.dom;
          scrollRoot.addEventListener("pointerdown", onPointerDownCapture, true);
          scrollRoot.addEventListener("click", onClickCapture, true);
          document.addEventListener("pointerdown", onPointerDownCapture, true);
          document.addEventListener("click", onClickCapture, true);
          return {
            destroy() {
              scrollRoot.removeEventListener(
                "pointerdown",
                onPointerDownCapture,
                true,
              );
              scrollRoot.removeEventListener("click", onClickCapture, true);
              document.removeEventListener(
                "pointerdown",
                onPointerDownCapture,
                true,
              );
              document.removeEventListener("click", onClickCapture, true);
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
            keydown(view, event) {
              if (event.key !== "Enter" && event.key !== " ") {
                return false;
              }

              const linkEl = findWikiLinkContentInEventPath(event);
              if (!linkEl) return false;

              event.preventDefault();
              return navigateWikiLinkFromTarget(
                view,
                linkEl,
                event,
                view.state.selection.from,
                onWikiLinkClick,
                navigationInFlight,
              );
            },
          },
          handleClick(view, pos, event) {
            const resolved = resolveWikiLinkFromPointerEvent(view, event);
            const linkEl = resolved.linkEl;
            const linkAtPos =
              resolved.linkAtPos ??
              (linkEl
                ? (wikiLinkMatchFromDomTarget(view, linkEl, event) ??
                  wikiLinkMatchAtPos(view.state.doc, pos))
                : wikiLinkMatchAtPos(view.state.doc, pos));

            if (!linkAtPos) {
              preClickSelectionFrom = null;
              preClickLinkSpan = null;
              return false;
            }

            const selectionFromBeforeClick =
              preClickLinkSpan?.start === linkAtPos.start &&
              preClickLinkSpan?.end === linkAtPos.end &&
              preClickSelectionFrom !== null
                ? preClickSelectionFrom
                : view.state.selection.from;

            preClickSelectionFrom = null;
            preClickLinkSpan = null;

            return navigateWikiLinkFromTarget(
              view,
              linkEl,
              event,
              selectionFromBeforeClick,
              onWikiLinkClick,
              navigationInFlight,
              linkAtPos,
            );
          },
        },
      }),
    ];
  },
});
