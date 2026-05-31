import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import {
  buildWikiLinkDecorations,
  findWikiLinks,
  isWikiLinkTargetTestId,
  wikiLinkTargetTestId,
} from "@/components/editor/WikiLinkDecoration";

const wikiLinkSource = readFileSync(
  join(process.cwd(), "src/components/editor/WikiLinkDecoration.ts"),
  "utf-8",
);
const tiptapSource = readFileSync(
  join(process.cwd(), "src/components/editor/TiptapEditor.tsx"),
  "utf-8",
);
const wikiLinkE2eSource = readFileSync(
  join(process.cwd(), "e2e/graph/wiki-link.spec.ts"),
  "utf-8",
);
const playgroundHelperSource = readFileSync(
  join(process.cwd(), "e2e/helpers/playground.ts"),
  "utf-8",
);

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
  },
});

function wikiLinkTestIdsFromState(
  state: EditorState,
  notes: readonly { id: string; title: string; status: string }[] = [],
): string[] {
  const decos = buildWikiLinkDecorations(state, () => notes);
  const found = decos.find(0, state.doc.content.size);
  return found
    .filter((deco) => deco.inline)
    .map(
      (deco) =>
        (deco as { type?: { attrs?: Record<string, string> } }).type?.attrs?.[
          "data-testid"
        ] ?? "",
    )
    .filter((id) => isWikiLinkTargetTestId(id));
}

describe("iteration 54 — wiki-link unique DOM (AC54)", () => {
  it("assigns a unique testid per wiki-link in multi-link content", () => {
    const doc = schema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "链接 [[欢迎使用 Hunos]] 和 [[项目文档]]。",
            },
          ],
        },
      ],
    });
    const state = EditorState.create({ schema, doc });
    const notes = [
      { id: "welcome-note", title: "欢迎使用 Hunos", status: "active" },
      { id: "project-docs", title: "项目文档", status: "active" },
    ];
    const testIds = wikiLinkTestIdsFromState(state, notes);

    expect(findWikiLinks(doc).length).toBe(2);
    expect(testIds.length).toBe(2);
    expect(new Set(testIds).size).toBe(2);
    expect(testIds).not.toContain("wiki-link-target");
    expect(testIds).toContain("wiki-link-target-welcome-note");
    expect(testIds).toContain("wiki-link-target-project-docs");
  });

  it("falls back to document position when target note is unresolved", () => {
    const doc = schema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "[[Missing Note]]" }],
        },
      ],
    });
    const state = EditorState.create({ schema, doc });
    const testIds = wikiLinkTestIdsFromState(state);

    expect(testIds).toEqual([wikiLinkTargetTestId({ start: 1 })]);
  });

  it("wires getNotes into decoration builder and disambiguated E2E selectors", () => {
    expect(wikiLinkSource).toContain("getNotes");
    expect(wikiLinkSource).toContain("wikiLinkTargetTestId");
    expect(wikiLinkSource).toContain('"data-note-id"');
    expect(tiptapSource).toContain("getNotes: () => notesRef.current");
    expect(playgroundHelperSource).toContain("wikiLinkByTitle");
    expect(wikiLinkE2eSource).toContain("wikiLinkByTitle");
    expect(wikiLinkE2eSource).toContain("AC42-wiki-link-offscreen-welcome");
  });
});
