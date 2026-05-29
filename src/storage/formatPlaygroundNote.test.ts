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
      "Cmd+Shift+F search all notes",
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
    expect(tryHintNode?.content?.[0]?.text).toContain("Cmd+Shift+Z");
    expect(tryHintNode?.content?.[0]?.text).toContain("Cmd+F 在笔记内查找");
    expect(tryHintNode?.content?.[0]?.text).toContain(
      "Cmd+Shift+F 搜索全部笔记",
    );
  });
});
