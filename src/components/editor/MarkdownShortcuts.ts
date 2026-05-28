import {
  Extension,
  markInputRule,
  wrappingInputRule,
} from '@tiptap/core';
import Bold, { starInputRegex } from '@tiptap/extension-bold';
import TaskItem from '@tiptap/extension-task-item';

const UNDERLINE_INPUT_REGEX = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/;
const TASK_ITEM_INPUT_REGEX = /^\s*-\s*\[([ x])\]\s$/;

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
