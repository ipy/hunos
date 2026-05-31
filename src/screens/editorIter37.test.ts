import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import zh from "@/i18n/zh.json";
import en from "@/i18n/en.json";
import { filterNotesByTitleFirstSearch } from "@/storage/noteSearchRank";

const editorSource = readFileSync(
  join(process.cwd(), "src/screens/EditorScreen.tsx"),
  "utf-8",
);
const tiptapSource = readFileSync(
  join(process.cwd(), "src/components/editor/TiptapEditor.tsx"),
  "utf-8",
);
const uiStoreSource = readFileSync(
  join(process.cwd(), "src/store/uiStore.ts"),
  "utf-8",
);

describe("iteration 37 — restore confirm", () => {
  it("opens confirm dialog before restoring playground seed", () => {
    expect(editorSource).toContain("ConfirmDialog");
    expect(editorSource).toContain('testId="restore-playground-confirm"');
    expect(editorSource).toContain("requestRestorePlaygroundConfirm");
    expect(editorSource).toContain("restorePlaygroundConfirmTitle");
    expect(editorSource).toContain("requestRestorePlaygroundConfirm");
    expect(
      readFileSync(
        join(process.cwd(), "src/components/common/ConfirmDialog.tsx"),
        "utf-8",
      ),
    ).toContain("createPortal");
    expect(editorSource).not.toMatch(
      /onClick=\{handleRestorePlayground\}[\s\S]{0,80}data-testid="restore-playground-button"/,
    );
  });

  it("ships zh/en confirm copy explaining format-seed reset", () => {
    expect(zh.notes.actions.restorePlaygroundConfirmTitle).toContain(
      "恢复格式模板",
    );
    expect(zh.notes.actions.restorePlaygroundConfirmMessage).toContain(
      "格式种子",
    );
    expect(zh.notes.actions.restorePlaygroundConfirmMessage).toContain(
      "自由试炼",
    );
    expect(en.notes.actions.restorePlaygroundConfirmMessage).toContain("seed");
  });
});

describe("iteration 37 — editor a11y label", () => {
  it("labels ProseMirror with note title via editor.regionLabel aria-label", () => {
    expect(editorSource).toContain('t("editor.regionLabel"');
    expect(editorSource).toContain(
      "accessibilityLabel={editorAccessibilityLabel}",
    );
    expect(tiptapSource).toContain("accessibilityLabel?: string");
    expect(tiptapSource).toContain('"aria-label": accessibilityLabel');
    expect(tiptapSource).not.toContain('"aria-labelledby": "note-editor-title"');
    expect(editorSource).toContain('id="note-editor-title"');
    expect(zh.editor.regionLabel).toBe("编辑：{{title}}");
  });
});

describe("iteration 37 — mobile list return", () => {
  it("returns to note list without stacking duplicate screens", () => {
    expect(uiStoreSource).toContain("returnToNoteList");
    expect(editorSource).toContain("returnToNoteList");
    expect(editorSource).toContain('data-testid="editor-all-notes-button"');
    expect(editorSource).toContain('data-testid="editor-back-button"');
  });
});

describe("iteration 37 — search title-first", () => {
  it("omits body-only playground when welcome title matches 欢迎", () => {
    const results = filterNotesByTitleFirstSearch(
      [
        {
          title: "格式试炼场",
          contentPlain: "链接 [[欢迎使用 Hunos]]",
        },
        { title: "欢迎使用 Hunos", contentPlain: "欢迎使用 Hunos 简介" },
      ],
      "欢迎",
    );
    expect(results.map((n) => n.title)).toEqual(["欢迎使用 Hunos"]);
  });

  it("excludes playground when 欢迎 appears only inside a wiki link", () => {
    const results = filterNotesByTitleFirstSearch(
      [
        {
          title: "格式试炼场",
          contentPlain: "链接 [[欢迎使用 Hunos]]",
        },
      ],
      "欢迎",
    );
    expect(results).toEqual([]);
  });
});
