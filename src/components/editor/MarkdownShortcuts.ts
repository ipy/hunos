import {
  Extension,
  InputRule,
  markInputRule,
} from '@tiptap/core';
import Bold, { starInputRegex } from '@tiptap/extension-bold';
import TaskItem from '@tiptap/extension-task-item';
import { findWrapping } from '@tiptap/pm/transform';
import type { NodeType, ResolvedPos } from '@tiptap/pm/model';
import type { Transaction } from '@tiptap/pm/state';

const UNDERLINE_INPUT_REGEX = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/;
const TASK_BRACKET_INPUT_REGEX = /^\s*(\[([ x])?\])\s$/;
const TASK_ITEM_INPUT_REGEX = /^\s*-\s*\[([ x])\]\s$/;

function isCheckedTaskMatch(match: RegExpMatchArray): boolean {
  return match[match.length - 1] === 'x';
}

function findBulletListItemDepth($from: ResolvedPos): number {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if (
      $from.node(depth).type.name === 'listItem'
      && $from.node(depth - 1).type.name === 'bulletList'
    ) {
      return depth;
    }
  }
  return -1;
}

function replaceBulletListWithTaskList(
  tr: Transaction,
  $from: ResolvedPos,
  listItemDepth: number,
  taskListType: NodeType,
  taskItemType: NodeType,
  checked: boolean,
) {
  const bulletListDepth = listItemDepth - 1;
  const bulletListPos = $from.before(bulletListDepth);
  const bulletList = $from.node(bulletListDepth);
  const listItem = $from.node(listItemDepth);
  const paragraph = listItem.firstChild;

  if (!paragraph?.isTextblock) {
    return false;
  }

  const taskItem = taskItemType.create({ checked }, paragraph);
  const taskList = taskListType.create(null, taskItem);

  tr.replaceWith(bulletListPos, bulletListPos + bulletList.nodeSize, taskList);
  return true;
}

function wrapParagraphInTaskItem(
  tr: Transaction,
  from: number,
  taskItemType: NodeType,
  checked: boolean,
) {
  const $start = tr.doc.resolve(from);
  const blockRange = $start.blockRange();
  const wrapping = blockRange && findWrapping(blockRange, taskItemType, { checked });

  if (!wrapping) {
    return false;
  }

  tr.wrap(blockRange, wrapping);
  return true;
}

function createTaskItemInputRule(
  find: RegExp,
  taskListType: NodeType,
  taskItemType: NodeType,
  getChecked: (match: RegExpMatchArray) => boolean,
) {
  return new InputRule({
    find,
    handler: ({ state, range, match }) => {
      const checked = getChecked(match);
      const tr = state.tr.delete(range.from, range.to);
      const $from = state.doc.resolve(range.from);
      const listItemDepth = findBulletListItemDepth($from);

      if (listItemDepth > 0) {
        if (!replaceBulletListWithTaskList(tr, $from, listItemDepth, taskListType, taskItemType, checked)) {
          return null;
        }
        return;
      }

      if (!wrapParagraphInTaskItem(tr, range.from, taskItemType, checked)) {
        return null;
      }
    },
  });
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

export const MarkdownTaskItem = TaskItem.extend({
  addInputRules() {
    return [];
  },
});

export const MarkdownShortcuts = Extension.create({
  name: 'markdownShortcuts',

  addInputRules() {
    const { schema } = this.editor;
    const { taskList, taskItem } = schema.nodes;

    return [
      createTaskItemInputRule(
        TASK_ITEM_INPUT_REGEX,
        taskList,
        taskItem,
        match => match[1] === 'x',
      ),
      createTaskItemInputRule(
        TASK_BRACKET_INPUT_REGEX,
        taskList,
        taskItem,
        isCheckedTaskMatch,
      ),
      markInputRule({
        find: UNDERLINE_INPUT_REGEX,
        type: schema.marks.underline,
      }),
    ];
  },
});
