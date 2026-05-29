import {
  Extension,
  InputRule,
  markInputRule,
  wrappingInputRule,
} from "@tiptap/core";
import Bold, { starInputRegex } from "@tiptap/extension-bold";
import BulletList from "@tiptap/extension-bullet-list";
import TaskItem from "@tiptap/extension-task-item";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import {
  applyCompletedTaskSink,
  findTaskItemsNewlyChecked,
} from "./taskSinkUtils";
import { findWrapping } from "@tiptap/pm/transform";
import type { Node, NodeType, ResolvedPos } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import type { InputRuleMatch } from "@tiptap/core";

const UNDERLINE_INPUT_REGEX = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/;
const TASK_BRACKET_INPUT_REGEX = /^\s*(\[([ x])?\])\s$/;
const TASK_ITEM_INPUT_REGEX = /^\s*-\s*\[([ x])\]\s$/;
const TASK_PREFIX_REGEX = /^\s*-\s*\[/;

function isCheckedTaskMatch(match: RegExpMatchArray): boolean {
  return match[2] === "x";
}

function asInputMatch(match: RegExpExecArray): InputRuleMatch {
  return { index: match.index, text: match[0] };
}

/** Defer hyphen bullets only while typing a task prefix (`- [` …), not for plain `- `. */
function shouldDeferHyphenBullet(text: string): boolean {
  if (TASK_ITEM_INPUT_REGEX.test(text)) {
    return false;
  }
  return TASK_PREFIX_REGEX.test(text);
}

function findBulletListItemDepth($from: ResolvedPos): number {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if (
      $from.node(depth).type.name === "listItem" &&
      $from.node(depth - 1).type.name === "bulletList"
    ) {
      return depth;
    }
  }
  return -1;
}

function convertBulletListItemToTask(
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
  const listItemIndex = $from.index(listItemDepth);
  const listItem = $from.node(listItemDepth);
  const paragraph = listItem.firstChild;

  if (!paragraph?.isTextblock) {
    return false;
  }

  const taskItem = taskItemType.create({ checked }, paragraph);
  const taskListNode = taskListType.create(null, taskItem);

  if (bulletList.childCount === 1) {
    tr.replaceWith(
      bulletListPos,
      bulletListPos + bulletList.nodeSize,
      taskListNode,
    );
    return true;
  }

  const beforeItems: Node[] = [];
  const afterItems: Node[] = [];

  for (let i = 0; i < bulletList.childCount; i += 1) {
    if (i < listItemIndex) {
      beforeItems.push(bulletList.child(i));
    } else if (i > listItemIndex) {
      afterItems.push(bulletList.child(i));
    }
  }

  const nodes: Node[] = [];

  if (beforeItems.length > 0) {
    nodes.push(bulletList.type.create(bulletList.attrs, beforeItems));
  }
  nodes.push(taskListNode);
  if (afterItems.length > 0) {
    nodes.push(bulletList.type.create(bulletList.attrs, afterItems));
  }

  tr.replaceWith(bulletListPos, bulletListPos + bulletList.nodeSize, nodes);
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
  const wrapping =
    blockRange && findWrapping(blockRange, taskItemType, { checked });

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
      const $from = tr.doc.resolve(range.from);
      const listItemDepth = findBulletListItemDepth($from);

      if (listItemDepth > 0) {
        if (
          !convertBulletListItemToTask(
            tr,
            $from,
            listItemDepth,
            taskListType,
            taskItemType,
            checked,
          )
        ) {
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

/**
 * `- ` converts immediately; `- [` … defers so `- [ ]` / `- [x]` task rules can run first.
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
        find: (text) => {
          if (shouldDeferHyphenBullet(text)) {
            return null;
          }

          const hyphen = /^\s*-\s$/.exec(text);
          if (hyphen) {
            return asInputMatch(hyphen);
          }

          return null;
        },
        type: listType,
      }),
    ];
  },
});

const taskItemSinkPluginKey = new PluginKey("taskItemSink");

export const MarkdownTaskItem = TaskItem.extend({
  addInputRules() {
    return [];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: taskItemSinkPluginKey,
        appendTransaction(transactions, oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) {
            return null;
          }

          const positions = findTaskItemsNewlyChecked(
            oldState.doc,
            newState.doc,
          );
          if (positions.length === 0) {
            return null;
          }

          const tr = newState.tr;
          if (!applyCompletedTaskSink(tr, positions)) {
            return null;
          }

          return tr;
        },
      }),
    ];
  },
});

export const MarkdownShortcuts = Extension.create({
  name: "markdownShortcuts",

  addInputRules() {
    const { schema } = this.editor;
    const { taskList, taskItem } = schema.nodes;

    return [
      createTaskItemInputRule(
        TASK_ITEM_INPUT_REGEX,
        taskList,
        taskItem,
        (match) => match[1] === "x",
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
