import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { schema as basicSchema } from "@tiptap/pm/schema-basic";
import { describe, expect, it } from "vitest";
import {
  filterTagCandidates,
  findTagSuggestionMatch,
  findTagSuggestionMatchInBlock,
} from "./tagSuggestionUtils";
import type { Tag } from "@/types/graph";

function makeTag(name: string): Tag {
  return {
    id: name,
    name,
    displayName: name.includes("/") ? name.split("/").pop()! : name,
    parentId: null,
    noteCount: 0,
    createdAt: 0,
  };
}

describe("findTagSuggestionMatchInBlock", () => {
  it("range starts at #, not preceding whitespace", () => {
    const text = "Organize with #form";
    const match = findTagSuggestionMatchInBlock(text, text.length);
    expect(match).toEqual({
      range: { from: 14, to: text.length },
      query: "form",
    });
  });

  it("line-start tag range starts at #", () => {
    const text = "#mytag";
    const match = findTagSuggestionMatchInBlock(text, text.length);
    expect(match).toEqual({
      range: { from: 0, to: text.length },
      query: "mytag",
    });
  });

  it("partial tag at line start", () => {
    const text = "#form";
    const match = findTagSuggestionMatchInBlock(text, text.length);
    expect(match).toEqual({
      range: { from: 0, to: text.length },
      query: "form",
    });
  });

  it("expands replace range to full tag when caret is inside complete tag", () => {
    const text = "Organize with #format-test";
    const caret = text.indexOf("format") + 4; // after "form"
    const match = findTagSuggestionMatchInBlock(text, caret);
    expect(match).toEqual({
      range: { from: 14, to: text.length },
      query: "format-test",
    });
  });

  it("expands replace range when caret is immediately after # in complete tag", () => {
    const text = "Organize with #format-test";
    const caret = text.indexOf("#") + 1;
    const match = findTagSuggestionMatchInBlock(text, caret);
    expect(match).toEqual({
      range: { from: 14, to: text.length },
      query: "format-test",
    });
  });

  it("does not expand beyond partial tag while typing", () => {
    const text = "Organize with #form";
    const match = findTagSuggestionMatchInBlock(text, text.length);
    expect(match).toEqual({
      range: { from: 14, to: text.length },
      query: "form",
    });
  });

  it("returns null for markdown heading at line start", () => {
    expect(findTagSuggestionMatchInBlock("# Heading", 9)).toBeNull();
    expect(findTagSuggestionMatchInBlock("## Subheading", 13)).toBeNull();
  });

  it("returns null when # is only followed by space (heading)", () => {
    expect(findTagSuggestionMatchInBlock("# ", 2)).toBeNull();
  });

  it("returns null outside block bounds", () => {
    expect(findTagSuggestionMatchInBlock("#tag", -1)).toBeNull();
    expect(findTagSuggestionMatchInBlock("#tag", 10)).toBeNull();
  });
});

const schema = new Schema({
  nodes: basicSchema.spec.nodes,
  marks: basicSchema.spec.marks,
});

function tagMatchAtCaret(text: string, caretInText: number) {
  const doc = schema.node("doc", null, [
    schema.node("paragraph", null, [schema.text(text)]),
  ]);
  const state = EditorState.create({
    doc,
    schema,
    selection: TextSelection.create(doc, 1 + caretInText),
  });
  return findTagSuggestionMatch(state);
}

describe("findTagSuggestionMatch", () => {
  it("expands to full tag using complete block text when caret is mid-token", () => {
    const text = "Organize with #format-test";
    const caret = text.indexOf("format") + 4;
    const match = tagMatchAtCaret(text, caret);
    expect(match).toEqual({
      range: { from: 1 + 14, to: 1 + text.length },
      query: "format-test",
    });
  });
});

describe("filterTagCandidates", () => {
  const tags = [
    makeTag("welcome"),
    makeTag("format-test"),
    makeTag("foo/"),
    makeTag(""),
  ];

  it("excludes invalid tags from results", () => {
    const result = filterTagCandidates(tags, "");
    expect(result.map((t) => t.name)).toEqual(["format-test", "welcome"]);
  });

  it("excludes invalid tags when filtering by query", () => {
    const result = filterTagCandidates(tags, "foo");
    expect(result.map((t) => t.name)).toEqual([]);
  });
});
