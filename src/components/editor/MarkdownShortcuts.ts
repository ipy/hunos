import {
  Extension,
  InputRule,
  markInputRule,
  wrappingInputRule,
} from "@tiptap/core";
import Bold, { starInputRegex } from "@tiptap/extension-bold";
import BulletList from "@tiptap/extension-bullet-list";
import TaskItem from "@tiptap/extension-task-item";
import {
  getFocusedTaskCheckboxPos,
  isModEnterKeyboardEvent,
  resolveTaskItemPosForToggle,
  resyncFocusedTaskCheckboxPos,
  setFocusedTaskCheckboxPos,
} from "./taskCheckboxFocus";
import { applyTaskItemToggleReorder } from "./taskSinkUtils";
import {
  isEditorSuggestionMenuOpen,
  isLinkEditorOpen,
} from "@/utils/editorSuggestionMenu";
import { findWrapping } from "@tiptap/pm/transform";
import type { Node, NodeType, ResolvedPos } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import type { InputRuleMatch } from "@tiptap/core";

const UNDERLINE_INPUT_REGEX = /(?:^|\s)(__(?!\s+__)((?:[^_]+))__(?!\s+__))$/;
const TASK_BRACKET_INPUT_REGEX = /^\s*(\[([ x])?\])\s$/;
const TASK_ITEM_INPUT_REGEX = /^\s*-\s*\[([ x])\]\s$/;
const TASK_PREFIX_REGEX = /^\s*-\s*\[/;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    taskItem: {
      toggleTaskItemWithReorder: () => ReturnType;
    };
  }
}

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

function taskItemShortcutBlocked(): boolean {
  return isEditorSuggestionMenuOpen() || isLinkEditorOpen();
}

export const MarkdownTaskItem = TaskItem.extend({
  addInputRules() {
    return [];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
    };
  },

  addCommands() {
    return {
      toggleTaskItemWithReorder:
        () =>
        ({ state, dispatch, editor }) => {
          const taskItemPos = resolveTaskItemPosForToggle(
            editor,
            this.name,
            state.selection.$from,
          );
          if (taskItemPos === null) {
            return false;
          }

          const node = state.doc.nodeAt(taskItemPos);
          if (!node) {
            return false;
          }

          const checked = !Boolean(node.attrs.checked);
          const tr = state.tr;
          if (!applyTaskItemToggleReorder(tr, taskItemPos, checked)) {
            return false;
          }

          resyncFocusedTaskCheckboxPos(editor, tr);
          dispatch?.(tr);
          return true;
        },
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const listItem = document.createElement("li");
      const checkboxWrapper = document.createElement("label");
      const checkboxStyler = document.createElement("span");
      const checkbox = document.createElement("input");
      const content = document.createElement("div");

      const updateA11Y = (currentNode: typeof node) => {
        checkbox.ariaLabel =
          this.options.a11y?.checkboxLabel?.(currentNode, checkbox.checked) ||
          `Task item checkbox for ${currentNode.textContent || "empty task item"}`;
      };

      updateA11Y(node);

      checkboxWrapper.contentEditable = "false";
      checkbox.type = "checkbox";

      const syncFocusedTaskCheckbox = () => {
        if (typeof getPos !== "function") {
          return;
        }

        const position = getPos();
        if (typeof position !== "number") {
          return;
        }

        setFocusedTaskCheckboxPos(editor, position);
      };

      const clearFocusedTaskCheckbox = () => {
        if (typeof getPos !== "function") {
          return;
        }

        const position = getPos();
        if (
          typeof position === "number" &&
          getFocusedTaskCheckboxPos(editor) === position
        ) {
          setFocusedTaskCheckboxPos(editor, null);
        }
      };

      checkbox.addEventListener("mousedown", (event) => event.preventDefault());
      checkbox.addEventListener("click", () => {
        checkbox.focus({ preventScroll: true });
      });
      checkbox.addEventListener("focus", syncFocusedTaskCheckbox);
      checkbox.addEventListener("blur", clearFocusedTaskCheckbox);
      checkbox.addEventListener("keydown", (event) => {
        if (!isModEnterKeyboardEvent(event) || taskItemShortcutBlocked()) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (!editor.isEditable) {
          return;
        }

        editor.commands.toggleTaskItemWithReorder();
      });
      checkbox.addEventListener("change", (event) => {
        if (!editor.isEditable && !this.options.onReadOnlyChecked) {
          checkbox.checked = !checkbox.checked;
          return;
        }

        const { checked } = event.target as HTMLInputElement;

        if (editor.isEditable && typeof getPos === "function") {
          editor
            .chain()
            .focus(undefined, { scrollIntoView: false })
            .command(({ tr }) => {
              const position = getPos();
              if (typeof position !== "number") {
                return false;
              }
              return applyTaskItemToggleReorder(tr, position, checked);
            })
            .run();
        }

        if (!editor.isEditable && this.options.onReadOnlyChecked) {
          if (!this.options.onReadOnlyChecked(node, checked)) {
            checkbox.checked = !checkbox.checked;
          }
        }
      });

      Object.entries(this.options.HTMLAttributes).forEach(([key, value]) => {
        listItem.setAttribute(key, value);
      });

      listItem.dataset.checked = node.attrs.checked ? "true" : "false";
      checkbox.checked = node.attrs.checked;

      checkboxWrapper.append(checkbox, checkboxStyler);
      listItem.append(checkboxWrapper, content);

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        listItem.setAttribute(key, value);
      });

      return {
        dom: listItem,
        contentDOM: content,
        destroy: clearFocusedTaskCheckbox,
        update: (updatedNode) => {
          if (updatedNode.type !== this.type) {
            return false;
          }

          listItem.dataset.checked = updatedNode.attrs.checked
            ? "true"
            : "false";
          checkbox.checked = updatedNode.attrs.checked;
          updateA11Y(updatedNode);

          if (
            document.activeElement === checkbox &&
            typeof getPos === "function"
          ) {
            const position = getPos();
            if (typeof position === "number") {
              setFocusedTaskCheckboxPos(editor, position);
            }
          }

          return true;
        },
      };
    };
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
