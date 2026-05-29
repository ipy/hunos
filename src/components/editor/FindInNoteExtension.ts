import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import {
  activeIndexAfterReplaceOne,
  clampFindIndex,
  findMatchesInDoc,
  sortMatchesForReplaceAll,
  wrapFindIndex,
  type FindMatch,
} from "./findInNoteUtils";

export interface FindInNotePluginState {
  open: boolean;
  query: string;
  replaceText: string;
  replaceMode: boolean;
  activeIndex: number;
  matches: FindMatch[];
  savedSelection: { from: number; to: number } | null;
  decorations: DecorationSet;
}

export const findInNotePluginKey = new PluginKey<FindInNotePluginState>(
  "findInNote",
);

export function getFindInNoteState(
  state: EditorState,
): FindInNotePluginState | undefined {
  return findInNotePluginKey.getState(state);
}

function buildDecorations(
  doc: EditorState["doc"],
  matches: FindMatch[],
  activeIndex: number,
): DecorationSet {
  if (matches.length === 0) {
    return DecorationSet.empty;
  }

  const decorations = matches.map((match, index) =>
    Decoration.inline(match.from, match.to, {
      class:
        index === activeIndex ? "find-match-active" : "find-match-inactive",
    }),
  );

  return DecorationSet.create(doc, decorations);
}

function createState(
  doc: EditorState["doc"],
  partial: Partial<FindInNotePluginState> & Pick<FindInNotePluginState, "open">,
): FindInNotePluginState {
  const query = partial.query ?? "";
  const matches = partial.matches ?? findMatchesInDoc(doc, query);
  const activeIndex =
    partial.activeIndex !== undefined
      ? clampFindIndex(partial.activeIndex, matches.length)
      : matches.length > 0
        ? 0
        : -1;

  return {
    open: partial.open,
    query,
    replaceText: partial.replaceText ?? "",
    replaceMode: partial.replaceMode ?? false,
    activeIndex,
    matches,
    savedSelection: partial.savedSelection ?? null,
    decorations: buildDecorations(doc, matches, activeIndex),
  };
}

function scrollActiveMatchIntoView(
  view: EditorView,
  match: FindMatch | undefined,
) {
  if (!match) return;

  const domPos = view.domAtPos(match.from);
  const target =
    domPos.node instanceof HTMLElement
      ? domPos.node
      : (domPos.node.parentElement as HTMLElement | null);

  target?.scrollIntoView({ block: "center", behavior: "smooth" });
}

interface FindInNoteMeta {
  type:
    | "open"
    | "close"
    | "setQuery"
    | "setReplaceText"
    | "next"
    | "prev"
    | "afterReplaceOne"
    | "afterReplaceAll";
  query?: string;
  replaceText?: string;
  replaceMode?: boolean;
  savedSelection?: { from: number; to: number };
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    findInNote: {
      openFindInNote: (options?: { replaceMode?: boolean }) => ReturnType;
      closeFindInNote: () => ReturnType;
      setFindInNoteQuery: (query: string) => ReturnType;
      setFindInNoteReplaceText: (replaceText: string) => ReturnType;
      findInNoteNext: () => ReturnType;
      findInNotePrevious: () => ReturnType;
      replaceFindInNoteMatch: () => ReturnType;
      replaceAllFindInNoteMatches: () => ReturnType;
    };
  }
}

export const FindInNoteExtension = Extension.create({
  name: "findInNote",

  addCommands() {
    return {
      openFindInNote:
        (options?: { replaceMode?: boolean }) =>
        ({ state, dispatch }) => {
          if (!dispatch) return true;
          const { from, to } = state.selection;
          dispatch(
            state.tr.setMeta(findInNotePluginKey, {
              type: "open",
              query: "",
              replaceText: "",
              replaceMode: options?.replaceMode ?? false,
              savedSelection: { from, to },
            } satisfies FindInNoteMeta),
          );
          return true;
        },
      closeFindInNote:
        () =>
        ({ state, dispatch }) => {
          if (!dispatch) return true;
          dispatch(
            state.tr.setMeta(findInNotePluginKey, {
              type: "close",
            } satisfies FindInNoteMeta),
          );
          return true;
        },
      setFindInNoteQuery:
        (query: string) =>
        ({ state, dispatch }) => {
          if (!dispatch) return true;
          dispatch(
            state.tr.setMeta(findInNotePluginKey, {
              type: "setQuery",
              query,
            } satisfies FindInNoteMeta),
          );
          return true;
        },
      setFindInNoteReplaceText:
        (replaceText: string) =>
        ({ state, dispatch }) => {
          if (!dispatch) return true;
          dispatch(
            state.tr.setMeta(findInNotePluginKey, {
              type: "setReplaceText",
              replaceText,
            } satisfies FindInNoteMeta),
          );
          return true;
        },
      findInNoteNext:
        () =>
        ({ state, dispatch }) => {
          if (!dispatch) return true;
          dispatch(
            state.tr.setMeta(findInNotePluginKey, {
              type: "next",
            } satisfies FindInNoteMeta),
          );
          return true;
        },
      findInNotePrevious:
        () =>
        ({ state, dispatch }) => {
          if (!dispatch) return true;
          dispatch(
            state.tr.setMeta(findInNotePluginKey, {
              type: "prev",
            } satisfies FindInNoteMeta),
          );
          return true;
        },
      replaceFindInNoteMatch:
        () =>
        ({ state, dispatch }) => {
          const pluginState = getFindInNoteState(state);
          if (!pluginState?.open || !dispatch) return false;

          const query = pluginState.query.trim();
          if (!query) return false;

          const match = pluginState.matches[pluginState.activeIndex];
          if (!match) return false;

          const marks = state.doc.resolve(match.from).marks();
          let tr = state.tr;
          if (pluginState.replaceText) {
            const node = state.schema.text(pluginState.replaceText, marks);
            tr = tr.replaceWith(match.from, match.to, node);
          } else {
            tr = tr.delete(match.from, match.to);
          }
          tr = tr.setMeta(findInNotePluginKey, {
            type: "afterReplaceOne",
          } satisfies FindInNoteMeta);
          dispatch(tr);
          return true;
        },
      replaceAllFindInNoteMatches:
        () =>
        ({ state, dispatch }) => {
          const pluginState = getFindInNoteState(state);
          if (!pluginState?.open || !dispatch) return false;

          const query = pluginState.query.trim();
          if (!query) return false;

          const matches = findMatchesInDoc(state.doc, query);
          if (matches.length === 0) return false;

          let tr = state.tr;
          for (const match of sortMatchesForReplaceAll(matches)) {
            const marks = state.doc.resolve(match.from).marks();
            if (pluginState.replaceText) {
              const node = state.schema.text(pluginState.replaceText, marks);
              tr = tr.replaceWith(match.from, match.to, node);
            } else {
              tr = tr.delete(match.from, match.to);
            }
          }
          tr = tr.setMeta(findInNotePluginKey, {
            type: "afterReplaceAll",
          } satisfies FindInNoteMeta);
          dispatch(tr);
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Escape: () => {
        const pluginState = getFindInNoteState(this.editor.state);
        if (!pluginState?.open) return false;
        return this.editor.commands.closeFindInNote();
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<FindInNotePluginState>({
        key: findInNotePluginKey,
        state: {
          init: (_, state) =>
            createState(state.doc, {
              open: false,
              query: "",
              replaceText: "",
              replaceMode: false,
              activeIndex: -1,
            }),
          apply: (tr, prev, _oldState, newState) => {
            const meta = tr.getMeta(findInNotePluginKey) as
              | FindInNoteMeta
              | undefined;

            if (meta?.type === "close") {
              return createState(newState.doc, {
                open: false,
                query: "",
                replaceText: "",
                replaceMode: false,
                activeIndex: -1,
                savedSelection: null,
              });
            }

            if (meta?.type === "open") {
              return createState(newState.doc, {
                open: true,
                query: "",
                replaceText: "",
                replaceMode: meta.replaceMode ?? false,
                activeIndex: -1,
                savedSelection: meta.savedSelection ?? {
                  from: newState.selection.from,
                  to: newState.selection.to,
                },
              });
            }

            if (!prev.open && !meta) {
              return prev;
            }

            let nextQuery = prev.query;
            let nextReplaceText = prev.replaceText;
            let nextActiveIndex = prev.activeIndex;

            if (meta?.type === "setQuery") {
              nextQuery = meta.query ?? "";
              nextActiveIndex = 0;
            } else if (meta?.type === "setReplaceText") {
              nextReplaceText = meta.replaceText ?? "";
            } else if (meta?.type === "next") {
              nextActiveIndex = wrapFindIndex(
                prev.activeIndex,
                prev.matches.length,
                "next",
              );
            } else if (meta?.type === "prev") {
              nextActiveIndex = wrapFindIndex(
                prev.activeIndex,
                prev.matches.length,
                "prev",
              );
            } else if (meta?.type === "afterReplaceOne") {
              const newMatches = findMatchesInDoc(newState.doc, prev.query);
              nextActiveIndex = activeIndexAfterReplaceOne(
                prev.activeIndex,
                prev.matches.length,
                newMatches.length,
              );
              return createState(newState.doc, {
                open: prev.open,
                query: nextQuery,
                replaceText: nextReplaceText,
                replaceMode: prev.replaceMode,
                activeIndex: nextActiveIndex,
                matches: newMatches,
                savedSelection: prev.savedSelection,
              });
            } else if (meta?.type === "afterReplaceAll") {
              const newMatches = findMatchesInDoc(newState.doc, prev.query);
              return createState(newState.doc, {
                open: prev.open,
                query: nextQuery,
                replaceText: nextReplaceText,
                replaceMode: prev.replaceMode,
                activeIndex:
                  newMatches.length > 0
                    ? clampFindIndex(0, newMatches.length)
                    : -1,
                matches: newMatches,
                savedSelection: prev.savedSelection,
              });
            } else if (tr.docChanged) {
              const matches = findMatchesInDoc(newState.doc, prev.query);
              nextActiveIndex = clampFindIndex(
                prev.activeIndex,
                matches.length,
              );
            }

            return createState(newState.doc, {
              open: prev.open,
              query: nextQuery,
              replaceText: nextReplaceText,
              replaceMode: prev.replaceMode,
              activeIndex: nextActiveIndex,
              savedSelection: prev.savedSelection,
            });
          },
        },
        props: {
          decorations(state) {
            return (
              getFindInNoteState(state)?.decorations ?? DecorationSet.empty
            );
          },
        },
        view() {
          return {
            update(view, prevState) {
              const prevPlugin = getFindInNoteState(prevState);
              const nextPlugin = getFindInNoteState(view.state);
              if (!nextPlugin?.open) return;

              const indexChanged =
                nextPlugin.activeIndex !== prevPlugin?.activeIndex;
              const queryChanged = nextPlugin.query !== prevPlugin?.query;

              if (indexChanged || queryChanged) {
                scrollActiveMatchIntoView(
                  view,
                  nextPlugin.matches[nextPlugin.activeIndex],
                );
              }
            },
          };
        },
      }),
    ];
  },
});
