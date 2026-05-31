import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { describe, expect, it } from "vitest";
import {
  WIKI_LINK_NOTES_REFRESH_META,
  buildWikiLinkDecorations,
  findWikiLinks,
  wikiLinkDataLinkKey,
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
const infoPanelSource = readFileSync(
  join(process.cwd(), "src/components/editor/InfoPanel.tsx"),
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

function wikiLinkContentAttrs(
  state: EditorState,
  notes: readonly { id: string; title: string; status: string }[] = [],
): Record<string, string>[] {
  const decos = buildWikiLinkDecorations(state, () => notes);
  const found = decos.find(0, state.doc.content.size);
  return found
    .filter((deco) => deco.inline)
    .map(
      (deco) =>
        (deco as { type?: { attrs?: Record<string, string> } }).type?.attrs ??
        {},
    )
    .filter((attrs) => attrs.class === "wiki-link-content");
}

describe("iteration 55 — wiki-link duplicate DOM (AC54)", () => {
  it("assigns distinct data-link-key per occurrence when titles resolve to same note", () => {
    const doc = schema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "[[项目文档]] 和 [[项目文档]]。" },
          ],
        },
      ],
    });
    const state = EditorState.create({ schema, doc });
    const notes = [{ id: "project-docs", title: "项目文档", status: "active" }];
    const attrs = wikiLinkContentAttrs(state, notes);

    expect(findWikiLinks(doc).length).toBe(2);
    expect(attrs.length).toBe(2);
    const linkKeys = attrs.map((a) => a["data-link-key"]);
    expect(new Set(linkKeys).size).toBe(2);
    expect(linkKeys).toEqual([
      wikiLinkDataLinkKey({ start: 1 }),
      wikiLinkDataLinkKey({ start: 12 }),
    ]);
    expect(attrs[0]?.["data-testid"]).toBe("wiki-link-target-project-docs");
    expect(attrs[1]?.["data-testid"]).toBe("wiki-link-target-project-docs");
  });
});

describe("iteration 55 — wiki-link deco fresh (AC55-deco-fresh)", () => {
  it("refreshes data-note-id when notes resolve without a body edit", () => {
    const doc = schema.nodeFromJSON({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "[[项目文档]]" }],
        },
      ],
    });
    let state = EditorState.create({ schema, doc });
    const unresolved = wikiLinkContentAttrs(state);
    expect(unresolved[0]?.["data-testid"]).toBe(wikiLinkTargetTestId({ start: 1 }));
    expect(unresolved[0]?.["data-note-id"]).toBeUndefined();

    const notes = [{ id: "project-docs", title: "项目文档", status: "active" }];
    const resolved = wikiLinkContentAttrs(state, notes);
    expect(resolved[0]?.["data-note-id"]).toBe("project-docs");
    expect(resolved[0]?.["data-testid"]).toBe("wiki-link-target-project-docs");
  });

  it("wires notes refresh meta through plugin state and TiptapEditor subscribe", () => {
    expect(WIKI_LINK_NOTES_REFRESH_META).toBe("wikiLinkNotesRefresh");
    expect(wikiLinkSource).toContain("WIKI_LINK_NOTES_REFRESH_META");
    expect(wikiLinkSource).toContain("notesRevision");
    expect(tiptapSource).toContain("WIKI_LINK_NOTES_REFRESH_META");
    expect(tiptapSource).toContain("useNoteStore.subscribe");
    expect(tiptapSource).toMatch(
      /useNoteStore\.subscribe[\s\S]*WIKI_LINK_NOTES_REFRESH_META/,
    );
  });
});

describe("iteration 55 — info panel done (AC55-info-panel-done)", () => {
  it("exposes visible 完成 control on mobile with info-panel-done testid", () => {
    expect(infoPanelSource).toContain("useAdaptiveLayout");
    expect(infoPanelSource).toContain('data-testid={isMobilePanel ? "info-panel-done"');
    expect(infoPanelSource).toContain('t("common.actions.done")');
  });
});

describe("iteration 55 — wiki-link offscreen E2E (AC42)", () => {
  it("clicks offscreen links via viewport coords without force:true", () => {
    expect(playgroundHelperSource).toContain("clickWikiLinkWithoutScroll");
    expect(playgroundHelperSource).toContain("page.mouse.click");
    expect(wikiLinkE2eSource).toContain("clickWikiLinkWithoutScroll");
    expect(wikiLinkE2eSource).not.toContain("force: true");
  });
});
