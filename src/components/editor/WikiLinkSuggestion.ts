import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import type { Note } from "@/types/note";
import {
  WikiLinkSuggestionMenu,
  type WikiLinkSuggestionItem,
} from "./WikiLinkSuggestionMenu";
import {
  getSuggestionAnchorRectAtPos,
  markSuggestionMenuClosedByEscape,
} from "@/utils/editorSuggestionMenu";
import {
  filterWikiLinkCandidates,
  findWikiLinkSuggestionMatch,
  isRangeIntersectingWikiLink,
} from "./wikiLinkSuggestionUtils";

export interface WikiLinkSuggestionOptions {
  getNoteId: () => string;
  getNotes: () => Note[];
}

const wikiLinkSuggestionKey = new PluginKey("wikiLinkSuggestion");

function buildItems(
  notes: Note[],
  query: string,
  noteId: string,
): WikiLinkSuggestionItem[] {
  const candidates = filterWikiLinkCandidates(notes, query, noteId);
  const items: WikiLinkSuggestionItem[] = candidates.map((note) => ({
    type: "note",
    note,
  }));

  const q = query.trim();
  if (q && candidates.length === 0) {
    items.push({ type: "create", query: q });
  }

  return items;
}

function insertWikiLink(
  editor: Editor,
  range: { from: number; to: number },
  title: string,
): void {
  if (isRangeIntersectingWikiLink(editor.state, range.from, range.to)) {
    return;
  }

  editor.chain().focus().deleteRange(range).insertContent(`[[${title}]]`).run();
}

export const WikiLinkSuggestion = Extension.create<WikiLinkSuggestionOptions>({
  name: "wikiLinkSuggestion",

  addOptions() {
    return {
      getNoteId: () => "",
      getNotes: () => [],
    };
  },

  addProseMirrorPlugins() {
    const { getNoteId, getNotes } = this.options;
    const editor = this.editor;

    let renderer: ReactRenderer | null = null;
    let lastNoteId = getNoteId();
    let selectedIndex = 0;
    let currentItems: WikiLinkSuggestionItem[] = [];
    let activeRange: { from: number; to: number } | null = null;
    let lastQuery = "";

    const destroyMenu = () => {
      renderer?.destroy();
      renderer = null;
      selectedIndex = 0;
      currentItems = [];
      activeRange = null;
      lastQuery = "";
    };

    const selectItem = (index: number) => {
      if (!activeRange || index < 0 || index >= currentItems.length) return;
      const item = currentItems[index];
      const title = item.type === "note" ? item.note.title : item.query;
      insertWikiLink(editor, activeRange, title);
      destroyMenu();
    };

    const getClientRect =
      (view: import("@tiptap/pm/view").EditorView) => () => {
        if (!activeRange) return null;
        return getSuggestionAnchorRectAtPos(view, activeRange.to);
      };

    const syncRenderer = (view: import("@tiptap/pm/view").EditorView) => {
      renderer?.updateProps({
        items: currentItems,
        selectedIndex,
        clientRect: getClientRect(view),
        onSelect: selectItem,
        onHighlight: (index: number) => {
          selectedIndex = index;
          syncRenderer(view);
        },
      });
    };

    const updateMenu = (view: import("@tiptap/pm/view").EditorView) => {
      const noteId = getNoteId();
      if (noteId !== lastNoteId) {
        lastNoteId = noteId;
        destroyMenu();
      }

      if (view.composing) {
        destroyMenu();
        return;
      }

      const match = findWikiLinkSuggestionMatch(view.state);
      if (!match) {
        destroyMenu();
        return;
      }

      const notes = getNotes();
      const items = buildItems(notes, match.query, getNoteId());
      if (items.length === 0) {
        destroyMenu();
        return;
      }

      if (match.query !== lastQuery) {
        selectedIndex = 0;
        lastQuery = match.query;
      } else {
        selectedIndex = Math.min(selectedIndex, items.length - 1);
      }

      currentItems = items;
      activeRange = match.range;

      const clientRect = getClientRect(view);
      if (!clientRect()) {
        destroyMenu();
        return;
      }

      const props = {
        items,
        selectedIndex,
        clientRect,
        onSelect: selectItem,
        onHighlight: (index: number) => {
          selectedIndex = index;
          syncRenderer(view);
        },
      };

      if (!renderer) {
        renderer = new ReactRenderer(WikiLinkSuggestionMenu, {
          editor,
          props,
        });
        document.body.appendChild(renderer.element);
      } else {
        renderer.updateProps(props);
      }
    };

    return [
      new Plugin({
        key: wikiLinkSuggestionKey,
        view(view) {
          updateMenu(view);
          return {
            update(view) {
              updateMenu(view);
            },
            destroy() {
              destroyMenu();
            },
          };
        },
        props: {
          handleKeyDown(view, event) {
            if (!renderer || currentItems.length === 0) return false;

            if (event.key === "ArrowDown") {
              event.preventDefault();
              selectedIndex = (selectedIndex + 1) % currentItems.length;
              syncRenderer(view);
              return true;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              selectedIndex =
                (selectedIndex - 1 + currentItems.length) % currentItems.length;
              syncRenderer(view);
              return true;
            }

            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              selectItem(selectedIndex);
              return true;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              markSuggestionMenuClosedByEscape();
              destroyMenu();
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});
