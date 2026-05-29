import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import {
  applyCompletedTaskSink,
  findTaskItemsNewlyChecked,
  sinkTaskItemToListBottom,
} from "./taskSinkUtils";

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

function textNode(value: string) {
  return schema.text(value);
}

function buildTaskItem(checked: boolean, label: string) {
  return taskItem.create({ checked }, [paragraph.create({}, textNode(label))]);
}

function buildPlaygroundTaskDoc() {
  return doc.create({}, [
    taskList.create({}, [
      buildTaskItem(false, "open"),
      buildTaskItem(true, "done"),
      buildTaskItem(false, "pending"),
    ]),
  ]);
}

function taskLabels(state: EditorState): string[] {
  const labels: string[] = [];
  state.doc.descendants((node) => {
    if (node.type.name === "taskItem") {
      labels.push(node.textContent);
    }
  });
  return labels;
}

function taskChecked(state: EditorState): boolean[] {
  const checked: boolean[] = [];
  state.doc.descendants((node) => {
    if (node.type.name === "taskItem") {
      checked.push(Boolean(node.attrs.checked));
    }
  });
  return checked;
}

function findTaskItemPos(state: EditorState, label: string): number {
  let found = -1;
  state.doc.descendants((node, pos) => {
    if (node.type.name === "taskItem" && node.textContent === label) {
      found = pos;
    }
  });
  expect(found).toBeGreaterThanOrEqual(0);
  return found;
}

function setTaskChecked(state: EditorState, label: string, checked: boolean) {
  const pos = findTaskItemPos(state, label);
  const tr = state.tr.setNodeMarkup(pos, undefined, {
    ...state.doc.nodeAt(pos)!.attrs,
    checked,
  });
  return state.apply(tr);
}

describe("findTaskItemsNewlyChecked", () => {
  it("detects a task item that was just checked", () => {
    const before = buildPlaygroundTaskDoc();
    const after = setTaskChecked(
      EditorState.create({ doc: before }),
      "pending",
      true,
    );

    expect(findTaskItemsNewlyChecked(before, after.doc)).toEqual([
      findTaskItemPos(after, "pending"),
    ]);
  });

  it("ignores unchecked and already-checked items", () => {
    const docNode = buildPlaygroundTaskDoc();
    expect(findTaskItemsNewlyChecked(docNode, docNode)).toEqual([]);
  });
});

describe("sinkTaskItemToListBottom", () => {
  it("moves a newly checked open item below completed items", () => {
    const state = EditorState.create({ doc: buildPlaygroundTaskDoc() });
    const checkedOpen = setTaskChecked(state, "open", true);
    const openPos = findTaskItemPos(checkedOpen, "open");

    const tr = checkedOpen.tr;
    sinkTaskItemToListBottom(tr, openPos);
    const next = checkedOpen.apply(tr);

    expect(taskLabels(next)).toEqual(["done", "pending", "open"]);
    expect(taskChecked(next)).toEqual([true, false, true]);
  });

  it("no-ops when the checked item is already last", () => {
    const state = EditorState.create({ doc: buildPlaygroundTaskDoc() });
    const checkedPending = setTaskChecked(state, "pending", true);
    const pendingPos = findTaskItemPos(checkedPending, "pending");

    const tr = checkedPending.tr;
    const changed = sinkTaskItemToListBottom(tr, pendingPos);

    expect(changed).toBe(false);
    expect(tr.doc.eq(checkedPending.doc)).toBe(true);
  });
});

describe("applyCompletedTaskSink", () => {
  it("reorders each newly checked item during sequential toggles", () => {
    let state = EditorState.create({
      doc: doc.create({}, [
        taskList.create({}, [
          buildTaskItem(false, "a"),
          buildTaskItem(false, "b"),
          buildTaskItem(true, "c"),
        ]),
      ]),
    });

    const checkAndSink = (label: string) => {
      const before = state;
      const afterCheck = setTaskChecked(before, label, true);
      const positions = findTaskItemsNewlyChecked(before.doc, afterCheck.doc);
      const tr = afterCheck.tr;
      applyCompletedTaskSink(tr, positions);
      state = afterCheck.apply(tr);
    };

    checkAndSink("a");
    checkAndSink("b");

    expect(taskLabels(state)).toEqual(["c", "a", "b"]);
    expect(taskChecked(state)).toEqual([true, true, true]);
  });

  it("matches format playground AC1 order after checking pending", () => {
    const state = EditorState.create({ doc: buildPlaygroundTaskDoc() });
    const checkedPending = setTaskChecked(state, "pending", true);

    const positions = findTaskItemsNewlyChecked(state.doc, checkedPending.doc);
    const tr = checkedPending.tr;
    applyCompletedTaskSink(tr, positions);
    const result = checkedPending.apply(tr);

    expect(taskLabels(result)).toEqual(["open", "done", "pending"]);
    expect(taskChecked(result)).toEqual([false, true, true]);
  });
});
