import { Schema } from "prosemirror-model";
import { describe, expect, it } from "vitest";
import { applyBulletListToolbarCommand } from "./listToolbarUtils";
import {
  captureEditorOverlaySelection,
  clearEditorOverlaySelection,
  runToolbarActionWithOverlaySelection,
} from "@/utils/editorOverlaySelection";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
    orderedList: { content: "listItem+", group: "block" },
    bulletList: { content: "listItem+", group: "block" },
    listItem: { content: "paragraph block*", defining: true },
  },
});

const { doc, paragraph, orderedList, bulletList, listItem } = schema.nodes;

function textNode(text: string) {
  return schema.text(text);
}

function buildOrderedSecondItemDoc() {
  return doc.create({}, [
    orderedList.create({}, [
      listItem.create({}, [paragraph.create({}, textNode("有序列表第一项"))]),
      listItem.create({}, [paragraph.create({}, textNode("有序列表第二项"))]),
    ]),
  ]);
}

function findSecondItemTextPos(
  document: ReturnType<typeof buildOrderedSecondItemDoc>,
) {
  let pos = 0;
  document.descendants((node, nodePos) => {
    if (node.isText && node.text === "有序列表第二项") {
      pos = nodePos;
    }
  });
  return { from: pos, to: pos + "有序列表第二项".length };
}

describe("applyBulletListToolbarCommand", () => {
  it("converts ordered list to bullet in place without orphan paragraph siblings", () => {
    clearEditorOverlaySelection();
    const document = buildOrderedSecondItemDoc();
    const { from } = findSecondItemTextPos(document);
    const chainSteps: string[] = [];
    const $from = document.resolve(from + 1);

    const editor = {
      state: {
        schema,
        doc: document,
        selection: { from: from + 1, to: from + 1, $from },
      },
    };

    const chain = {
      toggleBulletList: () => {
        chainSteps.push("toggleBulletList");
        return chain;
      },
      command: (
        fn: (ctx: { tr: { setNodeMarkup: () => void } }) => boolean,
      ) => {
        chainSteps.push("setNodeMarkup");
        fn({ tr: { setNodeMarkup: () => {} } });
        return chain;
      },
    };

    applyBulletListToolbarCommand(editor as never, chain as never);

    expect(chainSteps).toEqual(["setNodeMarkup"]);
    expect(chainSteps).not.toContain("toggleBulletList");
  });

  it("uses saved overlay anchor when editor selection is stale at document start", () => {
    clearEditorOverlaySelection();
    const document = buildOrderedSecondItemDoc();
    const { from, to } = findSecondItemTextPos(document);
    const chainSteps: string[] = [];
    const stale$from = document.resolve(1);

    const editor = {
      state: {
        schema,
        doc: document,
        selection: { from: 1, to: 1, empty: true, $from: stale$from },
      },
    };

    captureEditorOverlaySelection({
      state: { selection: { from, to }, doc: document },
    } as never);

    const chain = {
      toggleBulletList: () => {
        chainSteps.push("toggleBulletList");
        return chain;
      },
      command: (
        fn: (ctx: { tr: { setNodeMarkup: () => void } }) => boolean,
      ) => {
        chainSteps.push("setNodeMarkup");
        fn({ tr: { setNodeMarkup: () => {} } });
        return chain;
      },
    };

    runToolbarActionWithOverlaySelection(editor as never, true, (ed) =>
      applyBulletListToolbarCommand(ed, chain as never),
    );

    expect(chainSteps).toEqual(["setNodeMarkup"]);
  });

  it("uses default toggle when caret is not inside an ordered list", () => {
    clearEditorOverlaySelection();
    const document = doc.create({}, [paragraph.create({}, textNode("plain"))]);
    const chainSteps: string[] = [];
    const $from = document.resolve(1);
    const editor = {
      state: {
        schema,
        doc: document,
        selection: { from: 1, to: 1, $from },
      },
    };
    const chain = {
      toggleBulletList: () => {
        chainSteps.push("toggleBulletList");
        return chain;
      },
      command: () => chain,
    };

    applyBulletListToolbarCommand(editor as never, chain as never);
    expect(chainSteps).toEqual(["toggleBulletList"]);
  });

  it("toggles bullet off when already inside a bullet list", () => {
    clearEditorOverlaySelection();
    const document = doc.create({}, [
      bulletList.create({}, [
        listItem.create({}, [paragraph.create({}, textNode("item"))]),
      ]),
    ]);
    const chainSteps: string[] = [];
    const $from = document.resolve(2);
    const editor = {
      state: {
        schema,
        doc: document,
        selection: { from: 2, to: 2, $from },
      },
    };
    const chain = {
      toggleBulletList: () => {
        chainSteps.push("toggleBulletList");
        return chain;
      },
      command: () => chain,
    };

    applyBulletListToolbarCommand(editor as never, chain as never);
    expect(chainSteps).toEqual(["toggleBulletList"]);
  });
});
