import type { Editor } from "@tiptap/core";
import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import {
  findTaskItemPosFromResolvedPos,
  getFocusedTaskCheckboxPos,
  isModEnterKeyboardEvent,
  isTaskCheckboxFocused,
  isTaskItemToggleContext,
  resolveTaskItemPosForToggle,
  setFocusedTaskCheckboxPos,
} from "./taskCheckboxFocus";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
    taskList: { content: "taskItem+", group: "block" },
    taskItem: {
      content: "paragraph block*",
      defining: true,
      attrs: { checked: { default: false } },
    },
  },
});

const { doc, paragraph, taskList, taskItem } = schema.nodes;

function buildTaskDoc() {
  return doc.create({}, [
    taskList.create({}, [
      taskItem.create({ checked: false }, [
        paragraph.create({}, schema.text("open")),
      ]),
      taskItem.create({ checked: true }, [
        paragraph.create({}, schema.text("done")),
      ]),
    ]),
  ]);
}

function mockEditor(activeNodes: string[], state: EditorState): Editor {
  return {
    state,
    isActive: (name: string) => activeNodes.includes(name),
  } as unknown as Editor;
}

function findTaskItemPos(
  taskDocument: ReturnType<typeof buildTaskDoc>,
  label: string,
): number {
  let found = -1;

  taskDocument.descendants((node, pos) => {
    if (node.type.name === "taskItem" && node.textContent === label) {
      found = pos;
    }
  });

  if (found < 0) {
    throw new Error(`Could not find task item for ${label}`);
  }

  return found;
}

function findTaskLabelPos(
  taskDocument: ReturnType<typeof buildTaskDoc>,
  label: string,
): number {
  let targetPos = -1;

  taskDocument.descendants((node, pos) => {
    if (node.type.name === "taskItem" && node.textContent === label) {
      targetPos = pos + 2;
    }
  });

  if (targetPos < 0) {
    throw new Error(`Could not find task item label position for ${label}`);
  }

  return targetPos;
}

describe("taskCheckboxFocus", () => {
  it("tracks focused checkbox position per editor", () => {
    const editor = {} as Editor;

    expect(getFocusedTaskCheckboxPos(editor)).toBeNull();
    expect(isTaskCheckboxFocused(editor)).toBe(false);

    setFocusedTaskCheckboxPos(editor, 2);
    expect(getFocusedTaskCheckboxPos(editor)).toBe(2);
    expect(isTaskCheckboxFocused(editor)).toBe(true);

    setFocusedTaskCheckboxPos(editor, null);
    expect(getFocusedTaskCheckboxPos(editor)).toBeNull();
  });

  it("resolves task item position from selection before focused checkbox", () => {
    const taskDocument = buildTaskDoc();
    const state = EditorState.create({
      doc: taskDocument,
      selection: TextSelection.create(
        taskDocument,
        findTaskLabelPos(taskDocument, "open"),
      ),
    });
    const editor = mockEditor(["taskItem"], state);

    setFocusedTaskCheckboxPos(editor, 99);

    expect(
      resolveTaskItemPosForToggle(editor, "taskItem", state.selection.$from),
    ).toBe(findTaskItemPos(taskDocument, "open"));
  });

  it("falls back to focused checkbox when selection is outside task item", () => {
    const taskDocument = buildTaskDoc();
    const state = EditorState.create({
      doc: taskDocument,
      selection: TextSelection.create(taskDocument, 1),
    });
    const editor = mockEditor([], state);

    setFocusedTaskCheckboxPos(editor, 17);

    expect(
      resolveTaskItemPosForToggle(editor, "taskItem", state.selection.$from),
    ).toBe(17);
  });

  it("finds task item depth from resolved position", () => {
    const taskDocument = buildTaskDoc();
    const state = EditorState.create({
      doc: taskDocument,
      selection: TextSelection.create(
        taskDocument,
        findTaskLabelPos(taskDocument, "open"),
      ),
    });

    expect(
      findTaskItemPosFromResolvedPos(state.selection.$from, "taskItem"),
    ).toBe(findTaskItemPos(taskDocument, "open"));
  });

  it("detects task toggle context from active task item or focused checkbox", () => {
    const editorWithTask = mockEditor(
      ["taskItem"],
      EditorState.create({ doc: buildTaskDoc() }),
    );
    expect(isTaskItemToggleContext(editorWithTask)).toBe(true);

    const editorWithCheckbox = mockEditor(
      [],
      EditorState.create({ doc: buildTaskDoc() }),
    );
    setFocusedTaskCheckboxPos(editorWithCheckbox, 2);
    expect(isTaskItemToggleContext(editorWithCheckbox)).toBe(true);

    const editorWithoutContext = mockEditor(
      [],
      EditorState.create({ doc: buildTaskDoc() }),
    );
    expect(isTaskItemToggleContext(editorWithoutContext)).toBe(false);
  });

  it("recognizes Mod+Enter keyboard events", () => {
    expect(
      isModEnterKeyboardEvent({
        metaKey: true,
        ctrlKey: false,
        key: "Enter",
        shiftKey: false,
        altKey: false,
      } as KeyboardEvent),
    ).toBe(true);

    expect(
      isModEnterKeyboardEvent({
        metaKey: false,
        ctrlKey: true,
        key: "Enter",
        shiftKey: false,
        altKey: false,
      } as KeyboardEvent),
    ).toBe(true);

    expect(
      isModEnterKeyboardEvent({
        metaKey: true,
        ctrlKey: false,
        key: "Enter",
        shiftKey: true,
        altKey: false,
      } as KeyboardEvent),
    ).toBe(false);
  });
});
