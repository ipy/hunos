import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import {
  applyPipeTableInputRule,
  createTableFromPipeTable,
  createTableWithHeaderRow,
  findPipeTableInputMatch,
  isBlockedForTableInput,
  isTableSeparatorRow,
  parsePipeTableRow,
  parsePipeTableText,
  PIPE_TABLE_INPUT_REGEX,
} from "./markdownTableUtils";

describe("parsePipeTableRow", () => {
  it("parses a two-column pipe row", () => {
    expect(parsePipeTableRow("| Alpha | Beta |")).toEqual(["Alpha", "Beta"]);
  });

  it("parses a three-column pipe row", () => {
    expect(parsePipeTableRow("| Name | Type | Status |")).toEqual([
      "Name",
      "Type",
      "Status",
    ]);
  });

  it("returns null for non-pipe lines", () => {
    expect(parsePipeTableRow("plain text")).toBeNull();
    expect(parsePipeTableRow("| incomplete")).toBeNull();
  });
});

describe("isTableSeparatorRow", () => {
  it("detects GFM separator cells", () => {
    expect(isTableSeparatorRow(["---", "---"])).toBe(true);
    expect(isTableSeparatorRow([":---", "---:"])).toBe(true);
  });

  it("rejects data rows", () => {
    expect(isTableSeparatorRow(["Alpha", "Beta"])).toBe(false);
  });
});

describe("findPipeTableInputMatch", () => {
  it("matches pipe rows on Enter", () => {
    const match = findPipeTableInputMatch("| Alpha | Beta |\n");
    expect(match?.[1]).toBe("| Alpha | Beta |");
  });

  it("ignores inline pipe text without line-start pipes", () => {
    expect(findPipeTableInputMatch("see | Alpha | Beta |\n")).toBeNull();
  });
});

describe("parsePipeTableText", () => {
  it("parses a full GFM pipe table", () => {
    const text = [
      "| 名称 | 类型 |",
      "| --- | --- |",
      "| 粗体 | 样式 |",
      "| 列表 | 块 |",
    ].join("\n");

    expect(parsePipeTableText(text)).toEqual({
      headerCells: ["名称", "类型"],
      dataRows: [
        ["粗体", "样式"],
        ["列表", "块"],
      ],
    });
  });

  it("parses header and separator only", () => {
    const text = ["| Alpha | Beta |", "| --- | --- |"].join("\n");

    expect(parsePipeTableText(text)).toEqual({
      headerCells: ["Alpha", "Beta"],
      dataRows: [],
    });
  });

  it("ignores surrounding blank lines", () => {
    const text = "\n| Alpha | Beta |\n| --- | --- |\n\n";

    expect(parsePipeTableText(text)).toEqual({
      headerCells: ["Alpha", "Beta"],
      dataRows: [],
    });
  });

  it("returns null for non-table text", () => {
    expect(parsePipeTableText("plain text")).toBeNull();
    expect(parsePipeTableText("| Alpha | Beta |")).toBeNull();
    expect(
      parsePipeTableText(
        ["intro", "| Alpha | Beta |", "| --- | --- |"].join("\n"),
      ),
    ).toBeNull();
  });

  it("returns null when column counts mismatch", () => {
    const text = ["| Alpha | Beta |", "| --- | --- |", "| only-one |"].join(
      "\n",
    );

    expect(parsePipeTableText(text)).toBeNull();
  });
});

describe("createTableFromPipeTable", () => {
  const schema = new Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: { group: "block", content: "inline*" },
      text: { group: "inline" },
      table: { content: "tableRow+", group: "block" },
      tableRow: { content: "(tableCell | tableHeader)+", tableRole: "row" },
      tableHeader: { content: "block+", tableRole: "header_cell" },
      tableCell: { content: "block+", tableRole: "cell" },
    },
  });

  it("creates header plus multiple data rows", () => {
    const table = createTableFromPipeTable(schema, {
      headerCells: ["名称", "类型"],
      dataRows: [
        ["粗体", "样式"],
        ["列表", "块"],
      ],
    });

    expect(table.childCount).toBe(3);
    expect(table.child(0).child(0).textContent).toBe("名称");
    expect(table.child(0).child(1).textContent).toBe("类型");
    expect(table.child(1).child(0).textContent).toBe("粗体");
    expect(table.child(1).child(1).textContent).toBe("样式");
    expect(table.child(2).child(0).textContent).toBe("列表");
    expect(table.child(2).child(1).textContent).toBe("块");
  });

  it("adds one empty data row when body is omitted", () => {
    const table = createTableFromPipeTable(schema, {
      headerCells: ["Alpha", "Beta"],
      dataRows: [],
    });

    expect(table.childCount).toBe(2);
    expect(table.child(1).child(0).textContent).toBe("");
    expect(table.child(1).child(1).textContent).toBe("");
  });
});

describe("createTableWithHeaderRow", () => {
  const schema = new Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: { group: "block", content: "inline*" },
      text: { group: "inline" },
      table: { content: "tableRow+", group: "block" },
      tableRow: { content: "(tableCell | tableHeader)+", tableRole: "row" },
      tableHeader: { content: "block+", tableRole: "header_cell" },
      tableCell: { content: "block+", tableRole: "cell" },
    },
  });

  it("creates header and empty data rows", () => {
    const table = createTableWithHeaderRow(schema, ["Alpha", "Beta"]);
    expect(table.type.name).toBe("table");
    expect(table.childCount).toBe(2);
    expect(table.child(0).child(0).type.name).toBe("tableHeader");
    expect(table.child(0).child(0).textContent).toBe("Alpha");
    expect(table.child(1).child(0).type.name).toBe("tableCell");
    expect(table.child(1).child(0).textContent).toBe("");
  });
});

describe("isBlockedForTableInput", () => {
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

  it("allows pipe input in top-level paragraphs", () => {
    const document = doc.create({}, [
      paragraph.create({}, schema.text("| A | B |")),
    ]);
    const $pos = document.resolve(2);
    expect(isBlockedForTableInput($pos)).toBe(false);
  });

  it("blocks pipe input inside table cells", () => {
    const document = doc.create({}, [
      table.create({}, [
        tableRow.create({}, [
          tableHeader.create({}, [paragraph.create()]),
          tableHeader.create({}, [paragraph.create()]),
        ]),
      ]),
    ]);
    const $pos = document.resolve(3);
    expect(isBlockedForTableInput($pos)).toBe(true);
  });

  it("blocks pipe input inside code blocks", () => {
    const document = doc.create({}, [
      codeBlock.create({}, schema.text("| A | B |")),
    ]);
    const $pos = document.resolve(1);
    expect(isBlockedForTableInput($pos)).toBe(true);
  });
});

const tableSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
    table: { content: "tableRow+", group: "block" },
    tableRow: { content: "(tableCell | tableHeader)+", tableRole: "row" },
    tableHeader: { content: "block+", tableRole: "header_cell" },
    tableCell: { content: "block+", tableRole: "cell" },
  },
});

function pipeRowEnterState(line: string) {
  const { doc, paragraph } = tableSchema.nodes;
  const document = doc.create({}, [
    paragraph.create({}, tableSchema.text(line)),
  ]);
  const cursorPos = 1 + line.length;
  const match = PIPE_TABLE_INPUT_REGEX.exec(`${line}\n`);
  if (!match) {
    throw new Error(`Expected pipe row match for ${line}`);
  }
  const range = {
    from: cursorPos - (match[0].length - "\n".length),
    to: cursorPos,
  };
  const state = EditorState.create({
    doc: document,
    schema: tableSchema,
    selection: TextSelection.create(document, cursorPos),
  });
  return { state, range, match };
}

describe("applyPipeTableInputRule integration", () => {
  it("creates a table when Enter is pressed after a pipe row", () => {
    const { state, range, match } = pipeRowEnterState("| Alpha | Beta |");
    const next = applyPipeTableInputRule(state, range, match);

    expect(next).not.toBeNull();
    expect(next!.doc.childCount).toBe(1);
    expect(next!.doc.firstChild?.type.name).toBe("table");

    const table = next!.doc.firstChild!;
    expect(table.childCount).toBe(2);
    expect(table.child(0).child(0).textContent).toBe("Alpha");
    expect(table.child(0).child(1).textContent).toBe("Beta");
    expect(table.child(0).child(0).type.name).toBe("tableHeader");
    expect(table.child(1).child(0).type.name).toBe("tableCell");
    expect(next!.selection.$from.parent.type.name).toBe("paragraph");
    expect(next!.selection.$from.node(-1)?.type.name).toBe("tableCell");
  });

  it("merges header paragraph and separator row into one table", () => {
    const { doc, paragraph } = tableSchema.nodes;
    const document = doc.create({}, [
      paragraph.create({}, tableSchema.text("| Alpha | Beta |")),
      paragraph.create({}, tableSchema.text("| --- | --- |")),
    ]);
    const line = "| --- | --- |";
    const cursorPos = document.child(0).nodeSize + 1 + line.length;
    const match = PIPE_TABLE_INPUT_REGEX.exec(`${line}\n`);
    expect(match).not.toBeNull();

    const range = {
      from: cursorPos - (match![0].length - "\n".length),
      to: cursorPos,
    };
    const state = EditorState.create({
      doc: document,
      schema: tableSchema,
      selection: TextSelection.create(document, cursorPos),
    });
    const next = applyPipeTableInputRule(state, range, match!);

    expect(next).not.toBeNull();
    expect(next!.doc.childCount).toBe(1);
    expect(next!.doc.firstChild?.type.name).toBe("table");
    expect(next!.doc.firstChild?.child(0).child(0).textContent).toBe("Alpha");
  });

  it("exposes capture group 1 from the RegExp find pattern", () => {
    const match = PIPE_TABLE_INPUT_REGEX.exec("| Alpha | Beta |\n");
    expect(match?.[1]).toBe("| Alpha | Beta |");
  });
});
