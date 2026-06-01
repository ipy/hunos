import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  WIKI_LINK_TARGET_TESTID_PREFIX,
  buildWikiLinkDecorations,
  findWikiLinkByLinkKey,
  isWikiLinkTargetTestId,
  wikiLinkDataLinkKey,
  wikiLinkTargetTestId,
} from "./WikiLinkDecoration";

const wikiLinkSource = readFileSync(
  join(process.cwd(), "src/components/editor/WikiLinkDecoration.ts"),
  "utf-8",
);

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
  },
});

const { doc, paragraph } = schema.nodes;

function inlineDecorationClasses(state: EditorState): string[] {
  const decos = buildWikiLinkDecorations(state);
  const found = decos.find(0, state.doc.content.size);
  return found
    .filter((deco) => deco.inline)
    .map((deco) => {
      const attrs = (deco as { type?: { attrs?: { class?: string } } }).type
        ?.attrs;
      return attrs?.class ?? "";
    });
}

function wikiLinkContentDecoration(
  state: EditorState,
  getNotes: () => readonly {
    id: string;
    title: string;
    status: string;
  }[] = () => [],
) {
  const decos = buildWikiLinkDecorations(state, getNotes);
  const found = decos.find(0, state.doc.content.size);
  return found
    .filter((deco) => deco.inline)
    .map(
      (deco) =>
        (deco as { type?: { attrs?: Record<string, string> } }).type?.attrs,
    )
    .find((attrs) => attrs?.class === "wiki-link-content");
}

function stateWithWikiCaret(caretOffsetInParagraph: number) {
  const prefix = "用 ";
  const label = "欢迎使用 Hunos";
  const suffix = "。";
  const document = doc.create({}, [
    paragraph.create({}, [
      schema.text(prefix),
      schema.text(`[[${label}]]`),
      schema.text(suffix),
    ]),
  ]);
  return EditorState.create({
    doc: document,
    schema,
    selection: TextSelection.create(document, 1 + caretOffsetInParagraph),
  });
}

describe("buildWikiLinkDecorations", () => {
  it("exports stable wiki-link target testid prefix", () => {
    expect(WIKI_LINK_TARGET_TESTID_PREFIX).toBe("wiki-link-target");
    expect(isWikiLinkTargetTestId("wiki-link-target-note-1")).toBe(true);
    expect(isWikiLinkTargetTestId("wiki-link-target")).toBe(true);
    expect(isWikiLinkTargetTestId("other-testid")).toBe(false);
  });

  it("tags wiki-link content with unique testid and data-wiki-title", () => {
    const state = stateWithWikiCaret(4);
    const attrs = wikiLinkContentDecoration(state);

    expect(attrs?.["data-testid"]).toBe(wikiLinkTargetTestId({ start: 3 }));
    expect(attrs?.["data-wiki-title"]).toBe("欢迎使用 Hunos");
    expect(attrs?.["data-testid"]).not.toBe("wiki-link-target");
  });

  it("resolves note id into testid and data-note-id when notes are available", () => {
    const state = stateWithWikiCaret(4);
    const attrs = wikiLinkContentDecoration(state, () => [
      { id: "welcome-id", title: "欢迎使用 Hunos", status: "active" },
    ]);

    expect(attrs?.["data-testid"]).toBe("wiki-link-target-welcome-id");
    expect(attrs?.["data-note-id"]).toBe("welcome-id");
    expect(attrs?.["data-link-key"]).toBe(wikiLinkDataLinkKey({ start: 3 }));
  });

  it("disambiguates duplicate titles via data-link-key", () => {
    const document = doc.create({}, [
      paragraph.create({}, [schema.text("[[项目文档]] 和 [[项目文档]]。")]),
    ]);
    const state = EditorState.create({ schema, doc: document });
    const decos = buildWikiLinkDecorations(state, () => [
      { id: "p1", title: "项目文档", status: "active" },
    ]);
    const found = decos.find(0, state.doc.content.size);
    const contentDecos = found
      .filter((deco) => deco.inline)
      .map(
        (deco) =>
          (deco as { type?: { attrs?: Record<string, string> } }).type?.attrs,
      )
      .filter((attrs) => attrs?.class === "wiki-link-content");

    expect(contentDecos.length).toBe(2);
    const keys = contentDecos.map((a) => a?.["data-link-key"]);
    expect(new Set(keys).size).toBe(2);
    expect(findWikiLinkByLinkKey(document, keys[0]!)?.title).toBe("项目文档");
    expect(findWikiLinkByLinkKey(document, keys[1]!)?.title).toBe("项目文档");
  });

  it("exposes link role and accessible name (AC39-wiki-link-a11y)", () => {
    const state = stateWithWikiCaret(4);
    const attrs = wikiLinkContentDecoration(state);

    expect(attrs?.role).toBe("link");
    expect(attrs?.["aria-label"]).toBe("欢迎使用 Hunos");
  });

  it("captures pre-click on pointerdown and mousedown for navigation", () => {
    expect(wikiLinkSource).toContain("captureWikiLinkPreClick");
    expect(wikiLinkSource).toContain("resolveWikiLinkFromPointerEvent");
    expect(wikiLinkSource).toContain("mousedown(view, event)");
    expect(wikiLinkSource).toContain("findEditorScrollContainer");
    expect(wikiLinkSource).toContain(
      'document.addEventListener("pointerdown", onPointerDownCapture, true)',
    );
    expect(wikiLinkSource).toContain(
      'document.addEventListener("click", onClickCapture, true)',
    );
  });

  it("resolves wiki-link span from DOM title without click pos (AC41)", () => {
    expect(wikiLinkSource).toContain("findWikiLinkByTitle");
    expect(wikiLinkSource).toContain("wikiLinkMatchFromDomTarget");
    expect(wikiLinkSource).toContain("findWikiLinkContentInEventPath");
    expect(wikiLinkSource).toContain("activateWikiLinkByTitle");
    expect(wikiLinkSource).toContain('tabindex: "0"');
    expect(wikiLinkSource).toContain("keydown(view, event)");
  });

  it("wires unique wiki-link target testids on content decoration", () => {
    expect(wikiLinkSource).toContain(
      `export const WIKI_LINK_TARGET_TESTID_PREFIX`,
    );
    expect(wikiLinkSource).toContain(`wikiLinkTargetTestId(wl, noteId)`);
    expect(wikiLinkSource).toContain(`"data-wiki-title": wl.title`);
    expect(wikiLinkSource).toContain(`"data-note-id"`);
    expect(wikiLinkSource).toContain(`"data-link-key"`);
  });

  it("always hides bracket characters instead of wiki-link-bracket-visible", () => {
    const caretPositions = [
      2, // first [
      3, // second [
      4, // first label char
      13, // last label char
      14, // first ]
      15, // second ]
    ];

    for (const offset of caretPositions) {
      const classes = inlineDecorationClasses(stateWithWikiCaret(offset));
      expect(classes).not.toContain("wiki-link-bracket-visible");
      expect(
        classes.filter((c) => c === "wiki-link-bracket-hidden"),
      ).toHaveLength(2);
    }
  });
});
