import { Schema } from "prosemirror-model";
import { describe, expect, it } from "vitest";
import { applyBulletListToolbarCommand } from "./listToolbarUtils";

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
    const document = buildOrderedSecondItemDoc();
    const { from } = findSecondItemTextPos(document);
    const chainSteps: string[] = [];
    const $from = document.resolve(from + 1);

    const editor = {
      isActive: (name: string) =>
        name === "orderedList" ? true : name === "bulletList" ? false : false,
      state: {
        schema,
        selection: { $from },
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
        const tr = {
          setNodeMarkup: () => {},
        };
        fn({ tr });
        return chain;
      },
    };

    applyBulletListToolbarCommand(editor as never, chain as never);

    expect(chainSteps).toEqual(["setNodeMarkup"]);
    expect(chainSteps).not.toContain("toggleBulletList");
  });

  it("uses default toggle when caret is not inside an ordered list", () => {
    const document = doc.create({}, [paragraph.create({}, textNode("plain"))]);
    const chainSteps: string[] = [];
    const editor = {
      isActive: () => false,
      state: {
        schema,
        selection: { $from: document.resolve(1) },
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
    const document = doc.create({}, [
      bulletList.create({}, [
        listItem.create({}, [paragraph.create({}, textNode("item"))]),
      ]),
    ]);
    const chainSteps: string[] = [];
    const editor = {
      isActive: (name: string) => name === "bulletList",
      state: {
        schema,
        selection: { $from: document.resolve(2) },
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
