import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import zh from "@/i18n/zh.json";
import en from "@/i18n/en.json";
import { NOTE_LIST_ITEM_TITLE_TESTID } from "@/screens/NoteListScreen";

const infoPanelSource = readFileSync(
  join(process.cwd(), "src/components/editor/InfoPanel.tsx"),
  "utf-8",
);
const tiptapSource = readFileSync(
  join(process.cwd(), "src/components/editor/TiptapEditor.tsx"),
  "utf-8",
);
const editorSource = readFileSync(
  join(process.cwd(), "src/screens/EditorScreen.tsx"),
  "utf-8",
);
const wikiLinkSource = readFileSync(
  join(process.cwd(), "src/components/editor/WikiLinkDecoration.ts"),
  "utf-8",
);
const notesHelperSource = readFileSync(
  join(process.cwd(), "e2e/helpers/notes.ts"),
  "utf-8",
);
const bootSpecSource = readFileSync(
  join(process.cwd(), "e2e/smoke/boot.spec.ts"),
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

describe("iteration 53 — TOC a11y dedup", () => {
  it("labels each TOC row once and skips list capture when the button is the target", () => {
    const entryBlock = infoPanelSource.slice(
      infoPanelSource.indexOf("data-testid={`info-panel-toc-entry-${i}`}"),
      infoPanelSource.indexOf('touchAction: "manipulation"'),
    );
    expect(entryBlock).toContain("aria-label={item.text}");
    expect(entryBlock).toContain("event.stopPropagation()");
    const listClickBlock = infoPanelSource.slice(
      infoPanelSource.indexOf("handleTocListClickCapture"),
      infoPanelSource.indexOf("handleTocListTouchEndCapture"),
    );
    expect(listClickBlock).toContain("if (directEntry)");
    expect(listClickBlock).toMatch(/if \(directEntry\)[\s\S]*return;/);
    expect(listClickBlock).not.toMatch(
      /if \(directEntry\)[\s\S]*activateTocEntry/,
    );
  });
});

describe("iteration 53 — editor a11y name", () => {
  it("uses aria-label on ProseMirror and hides injected stylesheet from a11y", () => {
    expect(tiptapSource).toContain('<style aria-hidden="true">');
    expect(tiptapSource).toContain('"aria-label": accessibilityLabel');
    expect(tiptapSource).toContain(
      'dom.setAttribute("aria-label", accessibilityLabel)',
    );
    expect(tiptapSource).not.toContain(
      '"aria-labelledby": "note-editor-title"',
    );
    expect(editorSource).toContain('t("editor.bodyLabel")');
    expect(zh.editor.bodyLabel).toBe("笔记正文");
    expect(en.editor.bodyLabel).toBe("Note body");
  });
});

describe("iteration 53 — wiki-link offscreen", () => {
  it("AC42 E2E targets zh-CN 项目文档 (default lang=zh-CN)", () => {
    expect(playgroundHelperSource).toContain(
      'PROJECT_DOCS_NOTE_TITLE = "项目文档"',
    );
    expect(wikiLinkE2eSource).toContain("PROJECT_DOCS_NOTE_TITLE");
    expect(wikiLinkE2eSource).not.toContain('data-wiki-title="project docs"');
  });

  it("navigates decoration targets without caret-outside guard", () => {
    expect(wikiLinkSource).toContain("WIKI_LINK_TARGET_TESTID_PREFIX");
    expect(wikiLinkSource).toContain("isWikiLinkTargetTestId");
    expect(wikiLinkSource).toContain("decorationTarget");
    expect(wikiLinkSource).toContain("pointerClick");
    expect(wikiLinkSource).toMatch(
      /pointerClick[\s\S]*shouldNavigateWikiLinkClick/,
    );
  });
});

describe("iteration 53 — note list select", () => {
  it("matches playground rows by exact title testid", () => {
    expect(NOTE_LIST_ITEM_TITLE_TESTID).toBe("note-list-item-title");
    expect(notesHelperSource).toContain("NOTE_LIST_ITEM_TITLE_TESTID");
    expect(notesHelperSource).toContain("exact: true");
    expect(bootSpecSource).toContain("note-list-item-title");
    expect(bootSpecSource).toContain("exact: true");
  });

  it("hides duplicate 全部笔记 text button from the accessibility tree", () => {
    expect(editorSource).toContain('data-testid="editor-all-notes-button"');
    expect(editorSource).toMatch(
      /data-testid="editor-all-notes-button"[\s\S]*aria-hidden="true"/,
    );
  });
});
