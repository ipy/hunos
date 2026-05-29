import { describe, expect, it } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { schema as basicSchema } from "@tiptap/pm/schema-basic";
import {
  clampFindIndex,
  findMatchesInDoc,
  wrapFindIndex,
} from "./findInNoteUtils";

const schema = new Schema({
  nodes: basicSchema.spec.nodes.append({
    codeBlock: {
      content: "text*",
      group: "block",
      code: true,
      parseDOM: [{ tag: "pre" }],
      toDOM: () => ["pre", ["code", 0]],
    },
    table: {
      content: "tableRow+",
      tableRole: "table",
      isolating: true,
      group: "block",
      parseDOM: [{ tag: "table" }],
      toDOM: () => ["table", ["tbody", 0]],
    },
    tableRow: {
      content: "(tableCell | tableHeader)+",
      tableRole: "row",
      parseDOM: [{ tag: "tr" }],
      toDOM: () => ["tr", 0],
    },
    tableCell: {
      content: "paragraph+",
      tableRole: "cell",
      isolating: true,
      parseDOM: [{ tag: "td" }],
      toDOM: () => ["td", 0],
    },
    tableHeader: {
      content: "paragraph+",
      tableRole: "header_cell",
      isolating: true,
      parseDOM: [{ tag: "th" }],
      toDOM: () => ["th", 0],
    },
  }),
  marks: basicSchema.spec.marks,
});

function docFromText(text: string) {
  return schema.node("doc", null, [
    schema.node("paragraph", null, [schema.text(text)]),
  ]);
}

describe("findMatchesInDoc", () => {
  it("finds case-insensitive matches in plain text", () => {
    const doc = docFromText("Lists and lists");
    const matches = findMatchesInDoc(doc, "lists");
    expect(matches).toHaveLength(2);
    expect(matches[0]).toEqual({ from: 1, to: 6 });
    expect(matches[1]).toEqual({ from: 11, to: 16 });
  });

  it("returns empty array for blank query", () => {
    const doc = docFromText("hello");
    expect(findMatchesInDoc(doc, "")).toEqual([]);
    expect(findMatchesInDoc(doc, "   ")).toEqual([]);
  });

  it("finds matches in code blocks and table cells", () => {
    const doc = schema.node("doc", null, [
      schema.node("codeBlock", null, [schema.text('const hello = "world";')]),
      schema.node("table", null, [
        schema.node("tableRow", null, [
          schema.node("tableHeader", null, [
            schema.node("paragraph", null, [schema.text("Lists")]),
          ]),
          schema.node("tableCell", null, [
            schema.node("paragraph", null, [schema.text("bold")]),
          ]),
        ]),
      ]),
    ]);

    const codeMatches = findMatchesInDoc(doc, "const");
    expect(codeMatches).toHaveLength(1);

    const tableMatches = findMatchesInDoc(doc, "lists");
    expect(tableMatches).toHaveLength(1);

    const boldMatches = findMatchesInDoc(doc, "bold");
    expect(boldMatches).toHaveLength(1);
  });
});

describe("wrapFindIndex", () => {
  it("wraps forward at the last match", () => {
    expect(wrapFindIndex(4, 5, "next")).toBe(0);
  });

  it("wraps backward at the first match", () => {
    expect(wrapFindIndex(0, 5, "prev")).toBe(4);
  });

  it("returns -1 when there are no matches", () => {
    expect(wrapFindIndex(0, 0, "next")).toBe(-1);
  });
});

describe("clampFindIndex", () => {
  it("clamps out-of-range indices", () => {
    expect(clampFindIndex(-1, 3)).toBe(0);
    expect(clampFindIndex(5, 3)).toBe(2);
    expect(clampFindIndex(1, 3)).toBe(1);
  });
});
