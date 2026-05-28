import {
  Extension,
  InputRule,
  markInputRule,
  wrappingInputRule,
} from '@tiptap/core';
import Bold, { starInputRegex } from '@tiptap/extension-bold';
import BulletList from '@tiptap/extension-bullet-list';
import TaskItem from '@tiptap/extension-task-item';
import { findWrapping } from '@tiptap/pm/transform';
import type { Transaction } from '@tiptap/pm/state';
import type { NodeType } from '@tiptap/pm/model';
import type { InputRuleMatch } from '@tiptap/core';

const UNDERLINE_INPUT_REGEX = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/;
const TASK_ITEM_INPUT_REGEX = /^\s*-\s*\[([ x])\]\s$/;
const TASK_PREFIX_REGEX = /^\s*-\s*\[/;

function asInputMatch(match: RegExpExecArray): InputRuleMatch {
  return {
    index: match.index,
    text: match[0],
  };
}

function shouldDeferHyphenBullet(text: string): boolean {
  if (TASK_ITEM_INPUT_REGEX.test(text)) {
    return false;
  }
  if (/^\s*-\s$/.test(text)) {
    return true;
  }
  return TASK_PREFIX_REGEX.test(text);
}

function wrapBlockInList(tr: Transaction, from: number, listType: NodeType) {
  const $start = tr.doc.resolve(from);
  const blockRange = $start.blockRange();
  const wrapping = blockRange && findWrapping(blockRange, listType);

  if (!wrapping) {
    return false;
  }

  tr.wrap(blockRange, wrapping);
  return true;
}

/**
 * Bold via `**` only — `__` is reserved for underline (see MARK_SYMBOLS).
 */
export const MarkdownBold = Bold.extend({
  addInputRules() {
    return [
      markInputRule({
        find: starInputRegex,
        type: this.type,
      }),
    ];
  },
});

/**
 * Hyphen bullets defer while the user may be typing `- [ ]` / `- [x]`.
 */
export const MarkdownBulletList = BulletList.extend({
  addInputRules() {
    const listType = this.type;

    return [
      wrappingInputRule({
        find: /^\s*([*+])\s$/,
        type: listType,
      }),
      wrappingInputRule({
        find: /^\s*-\s{2}$/,
        type: listType,
      }),
      wrappingInputRule({
        find: (text) => {
          if (shouldDeferHyphenBullet(text)) {
            return null;
          }

          const emptyHyphen = /^\s*-\s$/.exec(text);
          if (emptyHyphen) {
            return asInputMatch(emptyHyphen);
          }

          return null;
        },
        type: listType,
      }),
      new InputRule({
        find: (text) => {
          if (shouldDeferHyphenBullet(text)) {
            return null;
          }

          const withContent = /^\s*-\s+([^[\n]+?)\s$/.exec(text);
          if (withContent) {
            return asInputMatch(withContent);
          }

          return null;
        },
        handler: ({ state, range, match }) => {
          const content = match[1];
          const tr = state.tr.delete(range.from, range.to);

          if (!wrapBlockInList(tr, range.from, listType)) {
            return null;
          }

          tr.insertText(content, range.from + 1);
        },
      }),
      new InputRule({
        find: (text) => {
          if (shouldDeferHyphenBullet(text.replace(/\n$/, ''))) {
            return null;
          }

          const emptyHyphenEnter = /^\s*-\s\n$/.exec(text);
          if (emptyHyphenEnter) {
            return asInputMatch(emptyHyphenEnter);
          }

          return null;
        },
        handler: ({ state, range }) => {
          const tr = state.tr.delete(range.from, range.to - 1);

          if (!wrapBlockInList(tr, range.from, listType)) {
            return null;
          }
        },
      }),
    ];
  },
});

export const MarkdownTaskItem = TaskItem.extend({
  addInputRules() {
    return [];
  },
});

export const MarkdownShortcuts = Extension.create({
  name: 'markdownShortcuts',

  addInputRules() {
    const { schema } = this.editor;

    return [
      wrappingInputRule({
        find: TASK_ITEM_INPUT_REGEX,
        type: schema.nodes.taskItem,
        getAttributes: match => ({
          checked: match[1] === 'x',
        }),
      }),
      wrappingInputRule({
        find: /^\s*(\[([ x])?\])\s$/,
        type: schema.nodes.taskItem,
        getAttributes: match => ({
          checked: match[match.length - 1] === 'x',
        }),
      }),
      markInputRule({
        find: UNDERLINE_INPUT_REGEX,
        type: schema.marks.underline,
      }),
    ];
  },
});
