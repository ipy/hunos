import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import {
  clampFindIndex,
  findMatchesInDoc,
  wrapFindIndex,
  type FindMatch,
} from "./findInNoteUtils";

export interface FindInNotePluginState {
  open: boolean;
  query: string;
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
  type: "open" | "close" | "setQuery" | "next" | "prev";
  query?: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    findInNote: {
      openFindInNote: () => ReturnType;
      closeFindInNote: () => ReturnType;
      setFindInNoteQuery: (query: string) => ReturnType;
      findInNoteNext: () => ReturnType;
      findInNotePrevious: () => ReturnType;
    };
  }
}

export const FindInNoteExtension = Extension.create({
  name: "findInNote",

  addCommands() {
    return {
      openFindInNote:
        () =>
        ({ state, dispatch }) => {
          if (!dispatch) return true;
          const { from, to } = state.selection;
          dispatch(
            state.tr.setMeta(findInNotePluginKey, {
              type: "open",
              query: "",
              savedSelection: { from, to },
            } satisfies FindInNoteMeta & {
              savedSelection: { from: number; to: number };
            }),
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
            createState(state.doc, { open: false, query: "", activeIndex: -1 }),
          apply: (tr, prev, _oldState, newState) => {
            const meta = tr.getMeta(findInNotePluginKey) as
              | (FindInNoteMeta & {
                  savedSelection?: { from: number; to: number };
                })
              | undefined;

            if (meta?.type === "close") {
              return createState(newState.doc, {
                open: false,
                query: "",
                activeIndex: -1,
                savedSelection: null,
              });
            }

            if (meta?.type === "open") {
              return createState(newState.doc, {
                open: true,
                query: "",
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
            let nextActiveIndex = prev.activeIndex;

            if (meta?.type === "setQuery") {
              nextQuery = meta.query ?? "";
              nextActiveIndex = 0;
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
