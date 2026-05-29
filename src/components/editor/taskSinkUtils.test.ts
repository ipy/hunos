import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import {
  applyCompletedTaskSink,
  applyOpenTaskFloat,
  findTaskItemsNewlyChecked,
  findTaskItemsNewlyUnchecked,
  floatTaskItemBeforeCompletedBlock,
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

function toggleTaskWithReorder(
  state: EditorState,
  label: string,
  checked: boolean,
) {
  const before = state;
  const afterToggle = setTaskChecked(before, label, checked);
  const checkedPositions = findTaskItemsNewlyChecked(
    before.doc,
    afterToggle.doc,
  );
  const uncheckedPositions = findTaskItemsNewlyUnchecked(
    before.doc,
    afterToggle.doc,
  );
  const tr = afterToggle.tr;
  applyCompletedTaskSink(tr, checkedPositions);
  applyOpenTaskFloat(tr, uncheckedPositions);
  return afterToggle.apply(tr);
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

describe("findTaskItemsNewlyUnchecked", () => {
  it("detects a task item that was just unchecked", () => {
    const before = buildPlaygroundTaskDoc();
    const after = setTaskChecked(
      EditorState.create({ doc: before }),
      "done",
      false,
    );

    expect(findTaskItemsNewlyUnchecked(before, after.doc)).toEqual([
      findTaskItemPos(after, "done"),
    ]);
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

describe("floatTaskItemBeforeCompletedBlock", () => {
  it("moves an unchecked item from the completed block before remaining checked items", () => {
    const state = EditorState.create({
      doc: doc.create({}, [
        taskList.create({}, [
          buildTaskItem(false, "open"),
          buildTaskItem(true, "done"),
          buildTaskItem(true, "pending"),
        ]),
      ]),
    });
    const uncheckedPending = setTaskChecked(state, "pending", false);
    const pendingPos = findTaskItemPos(uncheckedPending, "pending");

    const tr = uncheckedPending.tr;
    floatTaskItemBeforeCompletedBlock(tr, pendingPos);
    const next = uncheckedPending.apply(tr);

    expect(taskLabels(next)).toEqual(["open", "pending", "done"]);
    expect(taskChecked(next)).toEqual([false, false, true]);
  });

  it("keeps order when unchecking the only completed item between open tasks", () => {
    const state = EditorState.create({ doc: buildPlaygroundTaskDoc() });
    const uncheckedDone = setTaskChecked(state, "done", false);
    const donePos = findTaskItemPos(uncheckedDone, "done");

    const tr = uncheckedDone.tr;
    floatTaskItemBeforeCompletedBlock(tr, donePos);
    const next = uncheckedDone.apply(tr);

    expect(taskLabels(next)).toEqual(["open", "done", "pending"]);
    expect(taskChecked(next)).toEqual([false, false, false]);
  });

  it("no-ops when the unchecked item is already in the open block", () => {
    const state = EditorState.create({ doc: buildPlaygroundTaskDoc() });
    const uncheckedDone = setTaskChecked(state, "done", false);
    const donePos = findTaskItemPos(uncheckedDone, "done");

    const tr = uncheckedDone.tr;
    const changed = floatTaskItemBeforeCompletedBlock(tr, donePos);

    expect(changed).toBe(false);
    expect(tr.doc.eq(uncheckedDone.doc)).toBe(true);
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
      state = toggleTaskWithReorder(state, label, true);
    };

    checkAndSink("a");
    checkAndSink("b");

    expect(taskLabels(state)).toEqual(["c", "a", "b"]);
    expect(taskChecked(state)).toEqual([true, true, true]);
  });

  it("matches format playground AC1 order after checking pending", () => {
    const state = EditorState.create({ doc: buildPlaygroundTaskDoc() });
    const result = toggleTaskWithReorder(state, "pending", true);

    expect(taskLabels(result)).toEqual(["open", "done", "pending"]);
    expect(taskChecked(result)).toEqual([false, true, true]);
  });
});

describe("applyOpenTaskFloat", () => {
  it("leaves playground order when unchecking the sole completed item", () => {
    const state = EditorState.create({ doc: buildPlaygroundTaskDoc() });
    const result = toggleTaskWithReorder(state, "done", false);

    expect(taskLabels(result)).toEqual(["open", "done", "pending"]);
    expect(taskChecked(result)).toEqual([false, false, false]);
  });

  it("floats an unchecked bottom item before remaining completed tasks", () => {
    let state = EditorState.create({ doc: buildPlaygroundTaskDoc() });
    state = toggleTaskWithReorder(state, "pending", true);
    const result = toggleTaskWithReorder(state, "pending", false);

    expect(taskLabels(result)).toEqual(["open", "pending", "done"]);
    expect(taskChecked(result)).toEqual([false, false, true]);
  });
});
