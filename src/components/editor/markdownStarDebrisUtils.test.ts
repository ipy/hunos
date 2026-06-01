import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import {
  buildUnclosedSingleStarCleanupTransaction,
  tryTrimUnclosedSingleStarOnSpace,
  UNCLOSED_SINGLE_STAR_INPUT_RE,
} from "./markdownStarDebrisUtils";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
  },
  marks: {
    italic: {},
    strike: {},
    bold: {},
  },
});

const { doc, paragraph } = schema.nodes;

function stateWithText(
  markdown: string,
  marks: import("@tiptap/pm/model").Mark[] = [],
) {
  const document = doc.create({}, [
    paragraph.create({}, schema.text(markdown, marks)),
  ]);
  const cursorPos = 1 + markdown.length;
  return EditorState.create({
    doc: document,
    schema,
    selection: TextSelection.create(document, cursorPos),
  });
}

describe("UNCLOSED_SINGLE_STAR_INPUT_RE", () => {
  it("matches a leading unclosed opener", () => {
    expect(UNCLOSED_SINGLE_STAR_INPUT_RE.exec("*未闭合")?.[1]).toBe("*未闭合");
  });

  it("matches after leading whitespace", () => {
    expect(UNCLOSED_SINGLE_STAR_INPUT_RE.exec(" *未闭合")?.[1]).toBe("*未闭合");
  });

  it("does not match a closed star pair", () => {
    expect(UNCLOSED_SINGLE_STAR_INPUT_RE.exec("*斜体*")).toBeNull();
  });
});

describe("unclosed star markdown debris (AC33-unclosed-star-plain)", () => {
  function editorFixture(
    markdown: string,
    marks: import("@tiptap/pm/model").Mark[] = [],
  ) {
    const state = stateWithText(markdown, marks);
    let dispatched: import("@tiptap/pm/state").Transaction | null = null;
    return {
      editor: {
        state,
        view: {
          dispatch: (tr: import("@tiptap/pm/state").Transaction) => {
            dispatched = tr;
          },
        },
      },
      getDispatched: () => dispatched,
    };
  }

  it("strips a dangling opener on Space (AC32-markdown-debris)", () => {
    const fixture = editorFixture("*未闭合");
    expect(tryTrimUnclosedSingleStarOnSpace(fixture.editor)).toBe(true);
    const tr = fixture.getDispatched();
    expect(tr?.doc.textContent).toBe("未闭合 ");
    expect(tr?.doc.textContent).not.toContain("*");
  });

  it("clears strike marks left on the debris word (AC33-unclosed-star-plain)", () => {
    const strikeMark = schema.marks.strike.create();
    const fixture = editorFixture("*未闭合", [strikeMark]);
    expect(tryTrimUnclosedSingleStarOnSpace(fixture.editor)).toBe(true);
    const tr = fixture.getDispatched();
    expect(tr?.doc.textContent).toBe("未闭合 ");
    const wordPos = 1;
    expect(tr?.doc.resolve(wordPos).marks()).toEqual([]);
  });

  it("does not strip when italic star pair is complete", () => {
    const fixture = editorFixture("*斜体*");
    expect(tryTrimUnclosedSingleStarOnSpace(fixture.editor)).toBe(false);
  });

  it("buildUnclosedSingleStarCleanupTransaction removes marks without dispatch", () => {
    const strikeMark = schema.marks.strike.create();
    const state = stateWithText("*未闭合", [strikeMark]);
    const tr = buildUnclosedSingleStarCleanupTransaction(
      state,
      state.selection.from,
    );
    expect(tr?.doc.textContent).toBe("未闭合 ");
    expect(tr?.doc.resolve(1).marks()).toEqual([]);
  });
});
