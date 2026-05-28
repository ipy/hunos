import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import type { Tag } from '@/types/graph';
import {
  TagSuggestionMenu,
  type TagSuggestionItem,
} from './TagSuggestionMenu';
import { markSuggestionMenuClosedByEscape } from '@/utils/editorSuggestionMenu';
import {
  filterTagCandidates,
  findTagSuggestionMatch,
} from './tagSuggestionUtils';

export interface TagSuggestionOptions {
  getTags: () => Tag[];
}

const tagSuggestionKey = new PluginKey('tagSuggestion');

function buildItems(tags: Tag[], query: string): TagSuggestionItem[] {
  const candidates = filterTagCandidates(tags, query);
  const items: TagSuggestionItem[] = candidates.map(tag => ({
    type: 'tag',
    tag,
  }));

  const q = query.trim();
  const hasExact = tags.some(t => t.name.toLowerCase() === q.toLowerCase());
  if (q && !hasExact && candidates.length === 0) {
    items.push({ type: 'create', query: q });
  }

  return items;
}

function insertTag(
  editor: Editor,
  range: { from: number; to: number },
  name: string,
): void {
  editor
    .chain()
    .focus()
    .deleteRange(range)
    .insertContent(`#${name}`)
    .run();
}

export const TagSuggestion = Extension.create<TagSuggestionOptions>({
  name: 'tagSuggestion',

  addOptions() {
    return {
      getTags: () => [],
    };
  },

  addProseMirrorPlugins() {
    const { getTags } = this.options;
    const editor = this.editor;

    let renderer: ReactRenderer | null = null;
    let selectedIndex = 0;
    let currentItems: TagSuggestionItem[] = [];
    let activeRange: { from: number; to: number } | null = null;
    let lastQuery = '';

    const destroyMenu = () => {
      renderer?.destroy();
      renderer = null;
      selectedIndex = 0;
      currentItems = [];
      activeRange = null;
      lastQuery = '';
    };

    const selectItem = (index: number) => {
      if (!activeRange || index < 0 || index >= currentItems.length) return;
      const item = currentItems[index];
      const name = item.type === 'tag' ? item.tag.name : item.query;
      insertTag(editor, activeRange, name);
      destroyMenu();
    };

    const getClientRect = (view: import('@tiptap/pm/view').EditorView) => () => {
      if (!activeRange) return null;
      const coords = view.coordsAtPos(activeRange.to);
      return new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top);
    };

    const syncRenderer = (view: import('@tiptap/pm/view').EditorView) => {
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

    const updateMenu = (view: import('@tiptap/pm/view').EditorView) => {
      if (view.composing) {
        destroyMenu();
        return;
      }

      const match = findTagSuggestionMatch(view.state);
      if (!match) {
        destroyMenu();
        return;
      }

      const tags = getTags();
      const items = buildItems(tags, match.query);
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

      const props = {
        items,
        selectedIndex,
        clientRect: getClientRect(view),
        onSelect: selectItem,
        onHighlight: (index: number) => {
          selectedIndex = index;
          syncRenderer(view);
        },
      };

      if (!renderer) {
        renderer = new ReactRenderer(TagSuggestionMenu, {
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
        key: tagSuggestionKey,
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

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              selectedIndex = (selectedIndex + 1) % currentItems.length;
              syncRenderer(view);
              return true;
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault();
              selectedIndex =
                (selectedIndex - 1 + currentItems.length) % currentItems.length;
              syncRenderer(view);
              return true;
            }

            if (event.key === 'Enter' || event.key === 'Tab') {
              event.preventDefault();
              selectItem(selectedIndex);
              return true;
            }

            if (event.key === 'Escape') {
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
