import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';

const TAG_REGEX = /(?:^|\s)#([\w\u4e00-\u9fff][\w\u4e00-\u9fff/]*)/g;
const tagDecorationKey = new PluginKey('tagDecoration');

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

    TAG_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TAG_REGEX.exec(node.text)) !== null) {
      const fullMatch = match[0];
      const hashOffset = fullMatch.indexOf('#');
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
          class: 'editor-tag editor-tag-active',
          'data-tag-name': tag.name,
        }),
      );
    } else {
      decorations.push(
        Decoration.inline(tag.start, tag.hashEnd, {
          class: 'editor-tag-hash',
        }),
        Decoration.inline(tag.hashEnd, tag.end, {
          class: 'editor-tag',
          'data-tag-name': tag.name,
        }),
      );
    }
  }

  return DecorationSet.create(doc, decorations);
}

export const TagDecoration = Extension.create({
  name: 'tagDecoration',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: tagDecorationKey,
        props: {
          decorations(state) {
            return buildDecorations(state);
          },
        },
      }),
    ];
  },
});
