import { describe, expect, it } from "vitest";
import {
  PLAYGROUND_CONTENT_VERSION,
  buildPlaygroundContent,
  isFormatPlaygroundNote,
  migratePlaygroundContentIfStale,
} from "./formatPlaygroundNote";

describe("isFormatPlaygroundNote", () => {
  it("matches canonical playground titles", () => {
    expect(isFormatPlaygroundNote("Format Playground")).toBe(true);
    expect(isFormatPlaygroundNote("格式试炼场")).toBe(true);
  });

  it("detects playground by content version when title is renamed", () => {
    const stale = buildPlaygroundContent("en") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: unknown[];
    };
    stale.attrs = { playgroundContentVersion: 5 };
    const content = JSON.stringify(stale);

    expect(isFormatPlaygroundNote("Format Playground Test", content)).toBe(
      true,
    );
  });

  it("returns false for unrelated notes", () => {
    expect(isFormatPlaygroundNote("Meeting Notes", '{"type":"doc"}')).toBe(
      false,
    );
  });
});

describe("migratePlaygroundContentIfStale", () => {
  it("returns null when playground content version is current", () => {
    const content = JSON.stringify(buildPlaygroundContent("en"));
    expect(migratePlaygroundContentIfStale(content, "en")).toBeNull();
  });

  it("updates tryHint and version for stale playground notes", () => {
    const stale = buildPlaygroundContent("en") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: unknown[];
    };
    stale.attrs = { playgroundContentVersion: 0 };
    const staleContent = JSON.stringify(stale);

    const migrated = migratePlaygroundContentIfStale(staleContent, "en");
    expect(migrated).not.toBeNull();

    const parsed = JSON.parse(migrated!) as {
      attrs?: { playgroundContentVersion?: number };
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    expect(parsed.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );

    const trySectionIndex = parsed.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "Try Your Own",
    );
    expect(trySectionIndex).toBeGreaterThan(-1);
    const tryHintNode = parsed.content[trySectionIndex + 1];
    expect(tryHintNode?.content?.[0]?.text).toContain("Cmd+Alt+↑/↓");
    expect(tryHintNode?.content?.[0]?.text).toContain("Cmd+D");
    expect(tryHintNode?.content?.[0]?.text).toContain("Cmd+Shift+K");
    expect(tryHintNode?.content?.[0]?.text).toContain("Cmd+Z");
    expect(tryHintNode?.content?.[0]?.text).toContain("Cmd+Shift+Z");
    expect(tryHintNode?.content?.[0]?.text).toContain("Cmd+F find in note");
    expect(tryHintNode?.content?.[0]?.text).toContain(
      "Cmd+Option+F find and replace",
    );
    expect(tryHintNode?.content?.[0]?.text).toContain(
      "Cmd+Shift+F search all notes",
    );
  });

  it("updates code block sample and language for stale playground notes", () => {
    const stale = buildPlaygroundContent("en") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: unknown[];
    };
    stale.attrs = { playgroundContentVersion: 7 };
    const staleContent = JSON.stringify(stale);

    const migrated = migratePlaygroundContentIfStale(staleContent, "en");
    expect(migrated).not.toBeNull();

    const parsed = JSON.parse(migrated!) as {
      attrs?: { playgroundContentVersion?: number };
      content: Array<{
        type: string;
        attrs?: { language?: string };
        content?: Array<{ text?: string }>;
      }>;
    };
    expect(parsed.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );

    const codeBlock = parsed.content.find((node) => node.type === "codeBlock");
    expect(codeBlock?.attrs?.language).toBe("javascript");
    expect(codeBlock?.content?.[0]?.text).toContain("function greet");
  });

  it("includes table hints in en seed", () => {
    const content = buildPlaygroundContent("en") as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    const trySectionIndex = content.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "Try Your Own",
    );
    const tryHintNode = content.content[trySectionIndex + 1];
    expect(tryHintNode?.content?.[0]?.text).toContain("| Name | Type |");
    expect(tryHintNode?.content?.[0]?.text).toContain(
      "Mod+Backspace delete table row",
    );
    expect(tryHintNode?.content?.[0]?.text).toContain("[text](url)");
    expect(tryHintNode?.content?.[0]?.text).toContain("Cmd+K links selected text");
  });

  it("includes external link sample in tags section", () => {
    const content = buildPlaygroundContent("en") as {
      content: Array<{
        type: string;
        content?: Array<{ text?: string; marks?: Array<{ type: string; attrs?: { href?: string } }> }>;
      }>;
    };
    const tagsSectionIndex = content.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "Tags & Links",
    );
    const tagsParagraph = content.content[tagsSectionIndex + 1];
    const linkNode = tagsParagraph?.content?.find((node) =>
      node.marks?.some((mark) => mark.type === "link"),
    );
    expect(linkNode?.text).toBe("project docs");
    expect(linkNode?.marks?.[0]?.attrs?.href).toBe("https://example.com");
  });

  it("updates tryHint and tags section for stale playground notes", () => {
    const stale = buildPlaygroundContent("en") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: unknown[];
    };
    stale.attrs = { playgroundContentVersion: 9 };
    const staleContent = JSON.stringify(stale);

    const migrated = migratePlaygroundContentIfStale(staleContent, "en");
    expect(migrated).not.toBeNull();

    const parsed = JSON.parse(migrated!) as {
      attrs?: { playgroundContentVersion?: number };
      content: Array<{
        type: string;
        content?: Array<{ text?: string; marks?: Array<{ type: string }> }>;
      }>;
    };
    expect(parsed.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );

    const trySectionIndex = parsed.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "Try Your Own",
    );
    const tryHintNode = parsed.content[trySectionIndex + 1];
    expect(tryHintNode?.content?.[0]?.text).toContain("[text](url)");

    const tagsSectionIndex = parsed.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "Tags & Links",
    );
    const tagsParagraph = parsed.content[tagsSectionIndex + 1];
    expect(
      tagsParagraph?.content?.some((node) =>
        node.marks?.some((mark) => mark.type === "link"),
      ),
    ).toBe(true);
  });

  it("updates tryHint with table syntax for stale playground notes", () => {
    const stale = buildPlaygroundContent("en") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: unknown[];
    };
    stale.attrs = { playgroundContentVersion: 8 };
    const staleContent = JSON.stringify(stale);

    const migrated = migratePlaygroundContentIfStale(staleContent, "en");
    expect(migrated).not.toBeNull();

    const parsed = JSON.parse(migrated!) as {
      attrs?: { playgroundContentVersion?: number };
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    expect(parsed.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );

    const trySectionIndex = parsed.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "Try Your Own",
    );
    const tryHintNode = parsed.content[trySectionIndex + 1];
    expect(tryHintNode?.content?.[0]?.text).toContain("| Name | Type |");
    expect(tryHintNode?.content?.[0]?.text).toContain(
      "move between table cells",
    );
  });

  it("includes undo/redo hints in zh seed", () => {
    const content = buildPlaygroundContent("zh") as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    const trySectionIndex = content.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "自由试炼",
    );
    const tryHintNode = content.content[trySectionIndex + 1];
    expect(tryHintNode?.content?.[0]?.text).toContain("Cmd+Z");
    expect(tryHintNode?.content?.[0]?.text).toContain("| 名称 | 类型 |");
    expect(tryHintNode?.content?.[0]?.text).toContain(
      "Mod+Backspace 删除表格行",
    );
    expect(tryHintNode?.content?.[0]?.text).toContain("[文字](url)");
    expect(tryHintNode?.content?.[0]?.text).toContain("Cmd+Shift+Z");
    expect(tryHintNode?.content?.[0]?.text).toContain("Cmd+F 在笔记内查找");
    expect(tryHintNode?.content?.[0]?.text).toContain(
      "Cmd+Option+F 查找并替换",
    );
    expect(tryHintNode?.content?.[0]?.text).toContain(
      "Cmd+Shift+F 搜索全部笔记",
    );
  });

  it("seeds highlighted javascript code block sample", () => {
    const content = buildPlaygroundContent("en") as {
      content: Array<{
        type: string;
        attrs?: { language?: string };
        content?: Array<{ text?: string }>;
      }>;
    };
    const codeBlock = content.content.find((node) => node.type === "codeBlock");
    expect(codeBlock?.attrs?.language).toBe("javascript");
    expect(codeBlock?.content?.[0]?.text).toContain("function greet");
  });
});
