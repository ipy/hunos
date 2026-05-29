import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import {
  applyCompletedTaskSink,
  applyOpenTaskFloat,
  applyTaskItemToggleReorder,
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

/** Format Playground seed: two open items, completed at bottom. */
function buildPlaygroundTaskDoc() {
  return doc.create({}, [
    taskList.create({}, [
      buildTaskItem(false, "open"),
      buildTaskItem(false, "pending"),
      buildTaskItem(true, "done"),
    ]),
  ]);
}

function buildInterleavedTaskDoc() {
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
  const pos = findTaskItemPos(state, label);
  const tr = state.tr;
  applyTaskItemToggleReorder(tr, pos, checked);
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
      findTaskItemPos(EditorState.create({ doc: before }), "pending"),
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
    const after = toggleTaskWithReorder(
      EditorState.create({ doc: before }),
      "done",
      false,
    );

    expect(findTaskItemsNewlyUnchecked(before, after.doc)).toEqual([
      findTaskItemPos(after, "done"),
    ]);
  });
});

describe("applyTaskItemToggleReorder", () => {
  it("checks pending and sinks it below the completed sample (AC1 seed)", () => {
    const state = EditorState.create({ doc: buildPlaygroundTaskDoc() });
    const result = toggleTaskWithReorder(state, "pending", true);

    expect(taskLabels(result)).toEqual(["open", "done", "pending"]);
    expect(taskChecked(result)).toEqual([false, true, true]);
  });

  it("returns true and updates checked when sink is a no-op (already last)", () => {
    const state = EditorState.create({ doc: buildInterleavedTaskDoc() });
    const pos = findTaskItemPos(state, "pending");
    const tr = state.tr;
    const changed = applyTaskItemToggleReorder(tr, pos, true);
    const result = state.apply(tr);

    expect(changed).toBe(true);
    expect(taskLabels(result)).toEqual(["open", "done", "pending"]);
    expect(taskChecked(result)).toEqual([false, true, true]);
  });

  it("serializes reordered task list child order for autosave (AC5)", () => {
    const state = EditorState.create({ doc: buildPlaygroundTaskDoc() });
    const result = toggleTaskWithReorder(state, "pending", true);
    const taskListJson = result.doc
      .toJSON()
      .content?.find((node: { type?: string }) => node.type === "taskList") as {
      content?: Array<{
        attrs?: { checked?: boolean };
        content?: Array<{ content?: Array<{ text?: string }> }>;
      }>;
    };

    const labels = (taskListJson.content ?? []).map(
      (item) => item.content?.[0]?.content?.[0]?.text,
    );
    const checked = (taskListJson.content ?? []).map(
      (item) => item.attrs?.checked,
    );

    expect(labels).toEqual(["open", "done", "pending"]);
    expect(checked).toEqual([false, true, true]);
  });

  it("checks open then pending and preserves completion order (AC4)", () => {
    let state = EditorState.create({ doc: buildPlaygroundTaskDoc() });
    state = toggleTaskWithReorder(state, "open", true);
    state = toggleTaskWithReorder(state, "pending", true);

    expect(taskLabels(state)).toEqual(["done", "open", "pending"]);
    expect(taskChecked(state)).toEqual([true, true, true]);
  });

  it("unchecks the topmost completed item above the remaining completed block (AC3)", () => {
    let state = EditorState.create({ doc: buildPlaygroundTaskDoc() });
    state = toggleTaskWithReorder(state, "open", true);
    state = toggleTaskWithReorder(state, "pending", true);
    state = toggleTaskWithReorder(state, "open", false);

    expect(taskLabels(state)).toEqual(["open", "done", "pending"]);
    expect(taskChecked(state)).toEqual([false, true, true]);
  });
});

describe("sinkTaskItemToListBottom", () => {
  it("moves a newly checked open item below completed items", () => {
    const state = EditorState.create({ doc: buildInterleavedTaskDoc() });
    const checkedOpen = toggleTaskWithReorder(state, "open", true);

    expect(taskLabels(checkedOpen)).toEqual(["done", "pending", "open"]);
    expect(taskChecked(checkedOpen)).toEqual([true, false, true]);
  });

  it("no-ops when the checked item is already last", () => {
    const state = EditorState.create({ doc: buildInterleavedTaskDoc() });
    const checkedPending = toggleTaskWithReorder(state, "pending", true);
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
    const result = toggleTaskWithReorder(state, "pending", false);

    expect(taskLabels(result)).toEqual(["open", "pending", "done"]);
    expect(taskChecked(result)).toEqual([false, false, true]);
  });

  it("moves an unchecked bottom completed item before remaining checked siblings", () => {
    let state = EditorState.create({ doc: buildPlaygroundTaskDoc() });
    state = toggleTaskWithReorder(state, "pending", true);
    const result = toggleTaskWithReorder(state, "pending", false);

    expect(taskLabels(result)).toEqual(["open", "pending", "done"]);
    expect(taskChecked(result)).toEqual([false, false, true]);
  });

  it("no-ops when the unchecked item is already in the open block", () => {
    const state = EditorState.create({ doc: buildPlaygroundTaskDoc() });
    const uncheckedDone = toggleTaskWithReorder(state, "done", false);
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
});

describe("applyOpenTaskFloat", () => {
  it("floats an unchecked completed item before remaining checked tasks", () => {
    let state = EditorState.create({ doc: buildPlaygroundTaskDoc() });
    state = toggleTaskWithReorder(state, "pending", true);

    const before = state;
    const afterUncheck = toggleTaskWithReorder(before, "pending", false);
    const positions = findTaskItemsNewlyUnchecked(before.doc, afterUncheck.doc);
    const tr = afterUncheck.tr;
    applyOpenTaskFloat(tr, positions);
    const result = afterUncheck.apply(tr);

    expect(taskLabels(result)).toEqual(["open", "pending", "done"]);
    expect(taskChecked(result)).toEqual([false, false, true]);
  });

  it("returns true and floats when unchecking from the completed block (AC3)", () => {
    const state = EditorState.create({
      doc: doc.create({}, [
        taskList.create({}, [
          buildTaskItem(false, "open"),
          buildTaskItem(true, "done"),
          buildTaskItem(true, "pending"),
        ]),
      ]),
    });
    const pos = findTaskItemPos(state, "pending");
    const tr = state.tr;
    const changed = applyTaskItemToggleReorder(tr, pos, false);
    const result = state.apply(tr);

    expect(changed).toBe(true);
    expect(taskLabels(result)).toEqual(["open", "pending", "done"]);
    expect(taskChecked(result)).toEqual([false, false, true]);
  });
});
