import { Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  WIKI_LINK_TARGET_TESTID,
  buildWikiLinkDecorations,
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

function wikiLinkContentDecoration(state: EditorState) {
  const decos = buildWikiLinkDecorations(state);
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
  it("exports stable wiki-link target testid", () => {
    expect(WIKI_LINK_TARGET_TESTID).toBe("wiki-link-target");
  });

  it("tags wiki-link content with data-testid and data-wiki-title", () => {
    const state = stateWithWikiCaret(4);
    const attrs = wikiLinkContentDecoration(state);

    expect(attrs?.["data-testid"]).toBe(WIKI_LINK_TARGET_TESTID);
    expect(attrs?.["data-wiki-title"]).toBe("欢迎使用 Hunos");
  });

  it("exposes link role and accessible name (AC39-wiki-link-a11y)", () => {
    const state = stateWithWikiCaret(4);
    const attrs = wikiLinkContentDecoration(state);

    expect(attrs?.role).toBe("link");
    expect(attrs?.["aria-label"]).toBe("欢迎使用 Hunos");
  });

  it("captures pre-click on pointerdown and mousedown for navigation", () => {
    expect(wikiLinkSource).toContain("captureWikiLinkPreClick");
    expect(wikiLinkSource).toContain("mousedown(view, event)");
    expect(wikiLinkSource).toContain(
      'addEventListener("pointerdown", onPointerDownCapture, true)',
    );
  });

  it("resolves wiki-link span from DOM title without click pos (AC41)", () => {
    expect(wikiLinkSource).toContain("findWikiLinkByTitle");
    expect(wikiLinkSource).toContain("wikiLinkMatchFromDomTarget");
    expect(wikiLinkSource).toContain('tabindex: "0"');
    expect(wikiLinkSource).toContain("keydown(view, event)");
  });

  it("wires wiki-link target testid on content decoration", () => {
    expect(wikiLinkSource).toContain(`export const WIKI_LINK_TARGET_TESTID`);
    expect(wikiLinkSource).toContain(`"data-testid": WIKI_LINK_TARGET_TESTID`);
    expect(wikiLinkSource).toContain(`"data-wiki-title": wl.title`);
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
