import { describe, expect, it } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { resolveMarkdownPasteAction } from "./markdownPasteUtils";

const GFM_TABLE = [
  "| 名称 | 类型 |",
  "| --- | --- |",
  "| 粗体 | 样式 |",
].join("\n");

describe("resolveMarkdownPasteAction", () => {
  const schema = new Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: { group: "block", content: "inline*" },
      text: { group: "inline" },
      table: { content: "tableRow+", group: "block" },
      tableRow: { content: "(tableCell | tableHeader)+", tableRole: "row" },
      tableHeader: { content: "block+", tableRole: "header_cell" },
      tableCell: { content: "block+", tableRole: "cell" },
      codeBlock: { content: "text*", group: "block", code: true },
    },
  });

  const { doc, paragraph, table, tableRow, tableHeader, tableCell, codeBlock } =
    schema.nodes;

  it("uses plain paste in code blocks for markdown syntax", () => {
    const document = doc.create({}, [
      codeBlock.create({}, schema.text("const x = 1;")),
    ]);
    const $from = document.resolve(1);
    expect(resolveMarkdownPasteAction("**bold** and # heading", $from)).toEqual(
      { kind: "plain" },
    );
  });

  it("uses plain paste in code blocks for GFM pipe tables", () => {
    const document = doc.create({}, [
      codeBlock.create({}, schema.text("const x = 1;")),
    ]);
    const $from = document.resolve(1);
    expect(resolveMarkdownPasteAction(GFM_TABLE, $from)).toEqual({
      kind: "plain",
    });
  });

  it("uses plain paste in table cells for markdown syntax", () => {
    const document = doc.create({}, [
      table.create({}, [
        tableRow.create({}, [
          tableCell.create({}, [
            paragraph.create({}, schema.text("cell")),
          ]),
        ]),
      ]),
    ]);
    const $from = document.resolve(4);
    expect(resolveMarkdownPasteAction("**bold** and # heading", $from)).toEqual(
      { kind: "plain" },
    );
  });

  it("uses plain paste in table cells for GFM pipe tables", () => {
    const document = doc.create({}, [
      table.create({}, [
        tableRow.create({}, [
          tableCell.create({}, [paragraph.create()]),
        ]),
      ]),
    ]);
    const $from = document.resolve(4);
    expect(resolveMarkdownPasteAction(GFM_TABLE, $from)).toEqual({
      kind: "plain",
    });
  });

  it("inserts native tables from open paragraphs", () => {
    const document = doc.create({}, [paragraph.create()]);
    const $from = document.resolve(1);
    const action = resolveMarkdownPasteAction(GFM_TABLE, $from);
    expect(action.kind).toBe("table");
    if (action.kind === "table") {
      expect(action.parsed.headerCells).toEqual(["名称", "类型"]);
      expect(action.parsed.dataRows).toEqual([["粗体", "样式"]]);
    }
  });

  it("renders markdown in open paragraphs", () => {
    const document = doc.create({}, [paragraph.create()]);
    const $from = document.resolve(1);
    expect(resolveMarkdownPasteAction("**bold** and # heading", $from)).toEqual(
      { kind: "markdown" },
    );
  });
});
