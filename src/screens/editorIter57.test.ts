import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  backlinksItemTestId,
  backlinksRowKey,
} from "@/components/backlinks/BacklinksPanel";
import {
  buildPlaygroundContent,
  migratePlaygroundContentIfStale,
  PLAYGROUND_CONTENT_VERSION,
} from "@/storage/formatPlaygroundNote";
import zh from "@/i18n/zh.json";

function findWikiLinkTitlesInTagsParagraph(locale: "zh" | "en"): string[] {
  const content = buildPlaygroundContent(locale) as {
    content: Array<{
      type: string;
      content?: Array<{ text?: string }>;
    }>;
  };
  const tagsHeading = locale === "zh" ? "标签与链接" : "Tags & Links";
  const tagsSectionIndex = content.content.findIndex(
    (node) =>
      node.type === "heading" && node.content?.[0]?.text === tagsHeading,
  );
  const tagsParagraph = content.content[tagsSectionIndex + 1];
  const titles: string[] = [];
  for (const node of tagsParagraph?.content ?? []) {
    const match = node.text?.match(/\[\[([^\]]+)\]\]/);
    if (match?.[1]) titles.push(match[1]);
  }
  return titles;
}

describe("iteration 57 — backlinks i18n (AC57-backlinks-i18n)", () => {
  it("localizes section headings in zh-CN without English fallbacks", () => {
    expect(zh.editor.backlinks.title).toBe("反向链接");
    expect(zh.editor.backlinks.outgoing).toBe("链接到");
    expect(zh.editor.backlinks.incoming).toBe("引用自");
    expect(Object.keys(zh.editor.backlinks)).toEqual(
      expect.arrayContaining(["title", "outgoing", "incoming"]),
    );
  });
});

describe("iteration 57 — backlinks unique DOM (AC57-backlinks-unique-dom)", () => {
  it("derives distinct testids per link row even when noteId repeats", () => {
    const row = {
      linkId: "mppmosoy-004-a",
      noteId: "pg-zh",
      noteTitle: "格式试炼场",
      context: "[[项目文档]]",
      type: "wiki_link" as const,
    };
    const duplicateNote = {
      ...row,
      linkId: "mppmosoy-004-b",
      context: "second [[项目文档]]",
    };
    expect(backlinksItemTestId(row.linkId)).not.toBe(
      backlinksItemTestId(duplicateNote.linkId),
    );
    expect(backlinksRowKey("incoming", row, 0)).not.toBe(
      backlinksRowKey("incoming", duplicateNote, 1),
    );
  });
});

describe("iteration 57 — canonical playground seed (AC57-seed-canonical)", () => {
  it("ships two 项目文档 wiki links in zh tags section at current version", () => {
    expect(PLAYGROUND_CONTENT_VERSION).toBeGreaterThanOrEqual(25);
    expect(findWikiLinkTitlesInTagsParagraph("zh")).toEqual([
      "欢迎使用 Hunos",
      "项目文档",
      "项目文档",
    ]);
  });

  it("migrates stale v24 stored seed to two 项目文档 links without manual wipe", () => {
    const stale = readFileSync(
      join(
        process.cwd(),
        "src/storage/fixtures/playground-zh-v24-single-link.json",
      ),
      "utf-8",
    );
    const migrated = migratePlaygroundContentIfStale(stale, "zh");
    expect(migrated).not.toBeNull();
    const parsed = JSON.parse(migrated!) as {
      attrs?: { playgroundContentVersion?: number };
      content: Array<{
        type: string;
        content?: Array<{ text?: string }>;
      }>;
    };
    expect(parsed.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );
    const tagsSectionIndex = parsed.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "标签与链接",
    );
    const wikiLinkNodes = parsed.content[tagsSectionIndex + 1]?.content?.filter(
      (node) => node.text?.includes("[[项目文档]]"),
    );
    expect(wikiLinkNodes?.length).toBe(2);
  });
});
