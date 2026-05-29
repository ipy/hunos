import { Schema } from "@tiptap/pm/model";
import { describe, expect, it } from "vitest";
import {
  createTableWithHeaderRow,
  findPipeTableInputMatch,
  isBlockedForTableInput,
  isTableSeparatorRow,
  parsePipeTableRow,
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
