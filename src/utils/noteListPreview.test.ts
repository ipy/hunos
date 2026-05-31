import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPlaygroundContent,
  formatPlaygroundMatchesCanonicalSeed,
  getFormatPlaygroundIntroExcerpt,
  playgroundPersistedContentForRow,
  shouldShowPlaygroundRestoreButton,
} from "@/storage/formatPlaygroundNote";
import { extractPlainTextFromTiptap } from "@/graph/linkExtractor";
import { deriveNoteListPreview } from "@/utils/noteListPreview";
import { isFormatPlaygroundNote } from "@/storage/formatPlaygroundNote";

describe("deriveNoteListPreview", () => {
  it("uses seed intro for unmodified zh playground content", () => {
    const seedPlain = extractPlainTextFromTiptap(buildPlaygroundContent("zh"));
    const preview = deriveNoteListPreview(
      {
        title: "格式试炼场",
        content: JSON.stringify(buildPlaygroundContent("zh")),
        contentPlain: seedPlain,
      },
      "格式示例",
      "zh",
    );
    expect(preview).toBe(getFormatPlaygroundIntroExcerpt("zh"));
    expect(preview).toContain("在这一篇笔记里测试所有格式");
    expect(preview).not.toBe("格式示例");
  });

  it("shows plain-text excerpt after playground body edits", () => {
    const seed = buildPlaygroundContent("zh");
    const marker = "T2-BODY-iter3-marker";
    const parsed = JSON.parse(JSON.stringify(seed)) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    const blocksIdx = parsed.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "块级元素",
    );
    parsed.content.splice(blocksIdx + 1, 0, {
      type: "paragraph",
      content: [{ type: "text", text: marker }],
    });
    const contentPlain = extractPlainTextFromTiptap(parsed);
    const preview = deriveNoteListPreview(
      {
        title: "格式试炼场",
        content: JSON.stringify(parsed),
        contentPlain,
      },
      "格式示例",
      "zh",
    );
    expect(contentPlain).toContain(marker);
    expect(preview).not.toBe(getFormatPlaygroundIntroExcerpt("zh"));
    expect(preview).not.toContain("桌面快捷键");
    expect(preview).not.toContain("Cmd+B");
    expect(preview).toContain("块级元素");
  });

  it("uses English seed intro when app locale is zh", () => {
    const enContent = JSON.stringify(buildPlaygroundContent("en"));
    const preview = deriveNoteListPreview(
      {
        title: "Format Playground",
        content: enContent,
        contentPlain: extractPlainTextFromTiptap(buildPlaygroundContent("en")),
      },
      "Formatting samples",
      "zh",
    );
    expect(preview).toBe(getFormatPlaygroundIntroExcerpt("en"));
    expect(preview).toContain("Test every format");
    expect(
      formatPlaygroundMatchesCanonicalSeed(
        "Format Playground",
        enContent,
        "zh",
      ),
    ).toBe(true);
  });

  it("uses seed intro after durable restore even when contentPlain is stale", () => {
    const enContent = JSON.stringify(buildPlaygroundContent("en"));
    const preview = deriveNoteListPreview(
      {
        title: "Format Playground",
        content: enContent,
        contentPlain: "T6-MIXED-stale-plain",
      },
      "Formatting samples",
      "en",
    );
    expect(preview).toBe(getFormatPlaygroundIntroExcerpt("en"));
    expect(preview).toContain("Test every format");
    expect(preview).not.toBe("Formatting samples");
  });

  it("truncates regular note plain text", () => {
    const plain = "a".repeat(200);
    const preview = deriveNoteListPreview(
      {
        title: "Meeting",
        content: "{}",
        contentPlain: plain,
      },
      "Formatting samples",
      "en",
    );
    expect(preview.length).toBeLessThanOrEqual(120);
  });

  it("list preview and restore chip agree after mismatched title on EN seed body", () => {
    const enContent = JSON.stringify(buildPlaygroundContent("en"));
    const rowContent = playgroundPersistedContentForRow(enContent);
    const note = {
      title: "格式试炼场",
      content: enContent,
      contentPlain: "stale",
    };
    const preview = deriveNoteListPreview(note, "Formatting samples", "en");
    const showRestore = shouldShowPlaygroundRestoreButton({
      displayTitle: "Format Playground",
      storedTitle: note.title,
      storedContent: rowContent,
      pendingDraftContent: null,
      fallbackLocale: "en",
    });
    expect(showRestore).toBe(true);
    expect(preview).toBe(getFormatPlaygroundIntroExcerpt("en"));

    const aligned = { ...note, title: "Format Playground" };
    expect(deriveNoteListPreview(aligned, "Formatting samples", "en")).toBe(
      getFormatPlaygroundIntroExcerpt("en"),
    );
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: aligned.title,
        storedTitle: aligned.title,
        storedContent: rowContent,
        pendingDraftContent: null,
        fallbackLocale: "en",
      }),
    ).toBe(false);
  });

  it("list preview and restore chip agree on canonical EN row", () => {
    const enContent = JSON.stringify(buildPlaygroundContent("en"));
    const rowContent = playgroundPersistedContentForRow(enContent);
    const note = {
      title: "Format Playground",
      content: enContent,
      contentPlain: "stale",
    };
    const preview = deriveNoteListPreview(note, "Formatting samples", "zh");
    const showRestore = shouldShowPlaygroundRestoreButton({
      displayTitle: note.title,
      storedTitle: note.title,
      storedContent: rowContent,
      pendingDraftContent: null,
      fallbackLocale: "zh",
    });
    expect(preview).toBe(getFormatPlaygroundIntroExcerpt("en"));
    expect(showRestore).toBe(false);
  });

  it("uses seed intro for TipTap editor echo persisted body (AC34-list-preview)", () => {
    const raw = readFileSync(
      join(
        process.cwd(),
        "src/storage/fixtures/playground-zh-tiptap-echo.json",
      ),
      "utf-8",
    );
    const parsed = JSON.parse(raw);
    const content = JSON.stringify(parsed);
    const contentPlain = extractPlainTextFromTiptap(parsed);
    const preview = deriveNoteListPreview(
      {
        title: "格式试炼场",
        content,
        contentPlain,
      },
      "格式示例",
      "zh",
    );
    expect(preview).toBe(getFormatPlaygroundIntroExcerpt("zh"));
    expect(preview).toContain("在这一篇笔记里测试所有格式");
    expect(preview).not.toContain("桌面快捷键");
    expect(preview).not.toContain("Cmd+B");
  });

  it("uses seed intro when only title drifted (AC34-list-preview)", () => {
    const seed = buildPlaygroundContent("zh");
    const seedPlain = extractPlainTextFromTiptap(seed);
    const preview = deriveNoteListPreview(
      {
        title: "T34-Drift",
        content: JSON.stringify(seed),
        contentPlain: seedPlain,
      },
      "格式示例",
      "zh",
    );
    expect(preview).toBe(getFormatPlaygroundIntroExcerpt("zh"));
    expect(preview).toContain("在这一篇笔记里测试所有格式");
    expect(preview).not.toContain("桌面快捷键");
    expect(preview).not.toContain("Cmd+B");
  });

  it("shows seed intro when drift is confined to 自由试炼 sandbox (AC34-list-preview)", () => {
    const seed = buildPlaygroundContent("zh");
    const parsed = JSON.parse(JSON.stringify(seed)) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    const tryIdx = parsed.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "自由试炼",
    );
    parsed.content.splice(tryIdx + 1, 0, {
      type: "paragraph",
      content: [{ type: "text", text: "sandbox-only marker" }],
    });
    const contentPlain = extractPlainTextFromTiptap(parsed);
    const preview = deriveNoteListPreview(
      {
        title: "格式试炼场",
        content: JSON.stringify(parsed),
        contentPlain,
      },
      "格式示例",
      "zh",
    );
    expect(preview).toBe(getFormatPlaygroundIntroExcerpt("zh"));
    expect(preview).toContain("在这一篇笔记里测试所有格式");
    expect(preview).not.toContain("桌面快捷键");
    expect(preview).not.toContain("Cmd+B");
  });

  it("edited playground fallback omits keyboard-shortcut footer (AC34-list-preview)", () => {
    const seed = buildPlaygroundContent("zh");
    const seedPlain = extractPlainTextFromTiptap(seed);
    const parsed = JSON.parse(JSON.stringify(seed)) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    parsed.content.splice(1, 1);
    const contentPlain = extractPlainTextFromTiptap(parsed);
    const preview = deriveNoteListPreview(
      {
        title: "格式试炼场",
        content: JSON.stringify(parsed),
        contentPlain,
      },
      "格式示例",
      "zh",
    );
    expect(preview).not.toContain("桌面快捷键");
    expect(preview).not.toContain("Cmd+B");
    expect(preview).not.toContain("Cmd+Shift+F");
    expect(preview.length).toBeGreaterThan(0);
    expect(preview).not.toBe("格式示例");
  });

  it("detects playground notes by title", () => {
    expect(isFormatPlaygroundNote("Format Playground")).toBe(true);
    expect(isFormatPlaygroundNote("格式试炼场")).toBe(true);
  });
});
