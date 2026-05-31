import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import zh from "@/i18n/zh.json";
import { plainTextFromTiptapTextNode } from "@/graph/linkExtractor";

const tiptapSource = readFileSync(
  join(process.cwd(), "src/components/editor/TiptapEditor.tsx"),
  "utf-8",
);
const wikiLinkDecorationSource = readFileSync(
  join(process.cwd(), "src/components/editor/WikiLinkDecoration.ts"),
  "utf-8",
);
const noteListSource = readFileSync(
  join(process.cwd(), "src/screens/NoteListScreen.tsx"),
  "utf-8",
);
const editorSource = readFileSync(
  join(process.cwd(), "src/screens/EditorScreen.tsx"),
  "utf-8",
);
const uiStoreSource = readFileSync(
  join(process.cwd(), "src/store/uiStore.ts"),
  "utf-8",
);

describe("iteration 39 — wiki-link navigation", () => {
  it("resolves wiki-link targets by exact title via noteStorage.findActiveByTitle", () => {
    expect(tiptapSource).toContain("findActiveByTitle");
    expect(tiptapSource).toContain("await store.setActiveNote(target.id)");
    expect(tiptapSource).not.toContain("noteStorage.search(title)");
  });

  it("captures pre-click selection before ProseMirror moves the caret into the link", () => {
    expect(wikiLinkDecorationSource).toContain(
      'addEventListener("pointerdown", onPointerDownCapture, true)',
    );
    expect(wikiLinkDecorationSource).toContain(
      "preClickSelectionFrom = view.state.selection.from",
    );
  });
});

describe("iteration 39 — search restore ghost", () => {
  it("merges pinned notes into filtered search results for the sidebar list", () => {
    expect(noteListSource).toContain("mergePinnedNotesForSearchDisplay");
    expect(noteListSource).toContain("activeNoteId");
  });

  it("re-runs sidebar search after playground restore when query is active", () => {
    expect(editorSource).toContain("performSearch(activeSearch)");
  });

  it("filters search only once via noteStorage.search", () => {
    expect(uiStoreSource).not.toContain("filterNotesByTitleFirstSearch");
    expect(uiStoreSource).toContain("await noteStorage.search(query)");
  });
});

describe("iteration 39 — checkbox a11y", () => {
  it("uses short checkbox labels that do not repeat task item text", () => {
    expect(zh.editor.task.checkboxOpen).toBe("未完成任务");
    expect(tiptapSource).toContain('i18n.t("editor.task.checkboxOpen")');
    expect(tiptapSource).not.toMatch(/checkboxOpen[\s\S]*\{\s*text\s*\}/);
  });
});

describe("iteration 39 — list row a11y", () => {
  it("exposes title · excerpt on the row and hides duplicate visible text from the tree", () => {
    expect(noteListSource).toContain("rowAriaLabel");
    expect(noteListSource).toContain("aria-label={rowAriaLabel}");
    expect(noteListSource).toContain('aria-hidden="true"');
  });
});

describe("iteration 39 — wiki-link body strip for search", () => {
  it("omits wikiLink mark text from derived plain text", () => {
    expect(
      plainTextFromTiptapTextNode("欢迎使用 Hunos", [
        { type: "wikiLink", attrs: { title: "欢迎使用 Hunos" } },
      ]),
    ).toBe(" ");
  });

  it("omits bracket wiki-link literals from derived plain text", () => {
    expect(plainTextFromTiptapTextNode("链接 [[欢迎使用 Hunos]]。")).toBe(
      "链接  。",
    );
  });
});
