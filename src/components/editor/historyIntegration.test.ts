import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { history, redo, undo } from "@tiptap/pm/history";
import { describe, expect, it } from "vitest";
import {
  buildDeleteLineTransaction,
  buildDuplicateLineTransaction,
} from "./blockLineUtils";
import { buildMoveBlockTransaction } from "./blockMoveUtils";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
    bulletList: { content: "listItem+", group: "block" },
    listItem: { content: "paragraph block*", defining: true },
  },
});

const { doc, paragraph, bulletList, listItem } = schema.nodes;

function textNode(value: string) {
  return schema.text(value);
}

function buildThreeBulletDoc() {
  return doc.create({}, [
    bulletList.create({}, [
      listItem.create({}, [paragraph.create({}, textNode("one"))]),
      listItem.create({}, [paragraph.create({}, textNode("two"))]),
      listItem.create({}, [paragraph.create({}, textNode("three"))]),
    ]),
  ]);
}

function findTextPos(
  document: ReturnType<typeof buildThreeBulletDoc>,
  text: string,
) {
  let targetPos = -1;
  document.descendants((node, pos) => {
    if (node.isText && node.text === text) {
      targetPos = pos + 1;
    }
    return true;
  });
  if (targetPos < 0) {
    throw new Error(`Could not find text "${text}"`);
  }
  return targetPos;
}

function stateAt(
  document: ReturnType<typeof buildThreeBulletDoc>,
  pos: number,
) {
  return EditorState.create({
    doc: document,
    schema,
    selection: TextSelection.create(document, pos),
    plugins: [history()],
  });
}

function listItemTexts(document: ReturnType<typeof buildThreeBulletDoc>) {
  const labels: string[] = [];
  document.descendants((node) => {
    if (node.type === listItem && node.textContent) {
      labels.push(node.textContent);
    }
    return true;
  });
  return labels;
}

function applyTransaction(
  state: EditorState,
  transaction: NonNullable<ReturnType<typeof buildDuplicateLineTransaction>>,
) {
  return state.apply(transaction);
}

function applyUndo(state: EditorState) {
  let next = state;
  undo(state, (tr) => {
    next = state.apply(tr);
  });
  return next;
}

function applyRedo(state: EditorState) {
  let next = state;
  redo(state, (tr) => {
    next = state.apply(tr);
  });
  return next;
}

describe("history integration for block line actions", () => {
  it("undo restores list after duplicate", () => {
    const document = buildThreeBulletDoc();
    const pos = findTextPos(document, "two");
    const state = stateAt(document, pos);
    const tr = buildDuplicateLineTransaction(state)!;
    const afterDuplicate = applyTransaction(state, tr);
    expect(listItemTexts(afterDuplicate.doc)).toEqual([
      "one",
      "two",
      "two",
      "three",
    ]);

    const afterUndo = applyUndo(afterDuplicate);
    expect(listItemTexts(afterUndo.doc)).toEqual(["one", "two", "three"]);
  });

  it("undo restores list after delete", () => {
    const document = buildThreeBulletDoc();
    const pos = findTextPos(document, "two");
    const state = stateAt(document, pos);
    const tr = buildDeleteLineTransaction(state)!;
    const afterDelete = applyTransaction(state, tr);
    expect(listItemTexts(afterDelete.doc)).toEqual(["one", "three"]);

    const afterUndo = applyUndo(afterDelete);
    expect(listItemTexts(afterUndo.doc)).toEqual(["one", "two", "three"]);
  });

  it("undo restores list after move down", () => {
    const document = buildThreeBulletDoc();
    const pos = findTextPos(document, "two");
    const state = stateAt(document, pos);
    const tr = buildMoveBlockTransaction(state, "down")!;
    const afterMove = applyTransaction(state, tr);
    expect(listItemTexts(afterMove.doc)).toEqual(["one", "three", "two"]);

    const afterUndo = applyUndo(afterMove);
    expect(listItemTexts(afterUndo.doc)).toEqual(["one", "two", "three"]);
  });

  it("redo re-applies duplicate after undo", () => {
    const document = buildThreeBulletDoc();
    const pos = findTextPos(document, "two");
    const state = stateAt(document, pos);
    const tr = buildDuplicateLineTransaction(state)!;
    const afterDuplicate = applyTransaction(state, tr);
    const afterUndo = applyUndo(afterDuplicate);
    expect(listItemTexts(afterUndo.doc)).toEqual(["one", "two", "three"]);

    const afterRedo = applyRedo(afterUndo);
    expect(listItemTexts(afterRedo.doc)).toEqual([
      "one",
      "two",
      "two",
      "three",
    ]);
  });
});
