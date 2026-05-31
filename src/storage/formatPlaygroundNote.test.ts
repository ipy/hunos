import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LEGACY_PLAYGROUND_SAMPLE_IMAGE_SRC,
  PLAYGROUND_SAMPLE_IMAGE_HEIGHT,
  PLAYGROUND_SAMPLE_IMAGE_SRC,
  PLAYGROUND_SAMPLE_IMAGE_TESTID,
} from "@/components/editor/imageEmbedUtils";
import {
  PLAYGROUND_CONTENT_VERSION,
  buildPlaygroundContent,
  filterNotesForPlaygroundList,
  getFormatPlaygroundIntroExcerpt,
  getFormatPlaygroundTitle,
  readFormatPlaygroundCanonicalRow,
  playgroundWriteRegressesCanonicalStored,
  isFormatPlaygroundNote,
  migratePlaygroundContentIfStale,
  playgroundContentMatchesLocale,
  formatPlaygroundMatchesCanonicalSeed,
  formatPlaygroundNeedsRestore,
  playgroundEditorContentMatchesStored,
  playgroundEditorMarkOnlyDriftFromStored,
  playgroundFormatQaDraftHidesRestoreChip,
  playgroundContentMatchesQaTableRowAppend,
  playgroundPersistCompareContentsEqual,
  playgroundPersistedContentForRow,
  playgroundFormatQaMarkOnlyDrift,
  playgroundFormatQaStructureMatchesCanonical,
  playgroundRestoreChipOverridesSuppress,
  classifyPlaygroundDrift,
  playgroundListsSectionHasMixedMarker,
  comparePlaygroundStructuralDrift,
  normalizePlaygroundNodeTreeSnapshot,
  resolvePlaygroundSeedLocale,
  playgroundTitleDriftedFromCanonical,
  shouldShowPlaygroundRestoreButton,
  restoreFormatPlaygroundContent,
} from "./formatPlaygroundNote";

const noteStorageUpdate = vi.fn();
const noteStorageGet = vi.fn();
const syncNoteLinks = vi.fn();

vi.mock("./noteStorage", () => ({
  noteStorage: {
    update: (...args: unknown[]) => noteStorageUpdate(...args),
    get: (...args: unknown[]) => noteStorageGet(...args),
  },
}));

vi.mock("@/graph/graphEngine", () => ({
  graphEngine: {
    syncNoteLinks: (...args: unknown[]) => syncNoteLinks(...args),
  },
}));

function extractTryHintText(
  tryHintNode:
    | {
        type: string;
        content?: Array<{
          type?: string;
          content?: Array<{ content?: Array<{ text?: string }> }>;
          text?: string;
        }>;
      }
    | undefined,
): string {
  if (!tryHintNode) return "";
  if (tryHintNode.type === "bulletList") {
    return (tryHintNode.content ?? [])
      .flatMap((item) =>
        (item.content ?? []).flatMap((block) =>
          (block.content ?? []).map((t) => t.text ?? ""),
        ),
      )
      .join(" ");
  }
  return tryHintNode.content?.[0]?.text ?? "";
}

function findTryHintNode(content: unknown) {
  const doc = content as {
    content: Array<{ type: string; content?: Array<{ text?: string }> }>;
  };
  const trySectionIndex = doc.content.findIndex(
    (node) =>
      node.type === "heading" &&
      (node.content?.[0]?.text === "Try Your Own" ||
        node.content?.[0]?.text === "自由试炼"),
  );
  return doc.content[trySectionIndex + 1];
}

function findTryHintText(content: unknown): string {
  return extractTryHintText(findTryHintNode(content));
}

const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;

function findWikiLinkTitlesInText(text: string): string[] {
  const titles: string[] = [];
  WIKI_LINK_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WIKI_LINK_REGEX.exec(text)) !== null) {
    titles.push(match[1].trim());
  }
  return titles;
}

function findTagsParagraphText(content: unknown, locale: "en" | "zh"): string {
  const doc = content as {
    content: Array<{ type: string; content?: Array<{ text?: string }> }>;
  };
  const heading = locale === "zh" ? "标签与链接" : "Tags & Links";
  const tagsSectionIndex = doc.content.findIndex(
    (node) => node.type === "heading" && node.content?.[0]?.text === heading,
  );
  const tagsParagraph = doc.content[tagsSectionIndex + 1];
  return (tagsParagraph?.content ?? []).map((node) => node.text ?? "").join("");
}

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

describe("buildPlaygroundContent", () => {
  it("stores locale in doc attrs", () => {
    const en = buildPlaygroundContent("en") as {
      attrs?: { playgroundContentLocale?: string };
    };
    const zh = buildPlaygroundContent("zh") as {
      attrs?: { playgroundContentLocale?: string };
    };
    expect(en.attrs?.playgroundContentLocale).toBe("en");
    expect(zh.attrs?.playgroundContentLocale).toBe("zh");
  });

  it("seeds zh title and intro for AC1", () => {
    const content = buildPlaygroundContent("zh") as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    expect(content.content[0]?.content?.[0]?.text).toBe("格式试炼场");
    expect(content.content[1]?.content?.[0]?.text).toMatch(/^在这一篇笔记里/);
  });

  it("uses localized tags wiki link glue in zh seed", () => {
    const content = buildPlaygroundContent("zh") as {
      content: Array<{
        type: string;
        content?: Array<{ text?: string }>;
      }>;
    };
    const tagsSectionIndex = content.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "标签与链接",
    );
    const tagsParagraph = content.content[tagsSectionIndex + 1];
    const joined = (tagsParagraph?.content ?? [])
      .map((node) => node.text ?? "")
      .join("");
    expect(joined).not.toContain(" and link to ");
    expect(joined).toContain("并链接");
  });

  it("does not seed spurious wiki links in try-hint prose", () => {
    for (const locale of ["en", "zh"] as const) {
      const content = buildPlaygroundContent(locale);
      expect(findWikiLinkTitlesInText(findTryHintText(content))).toEqual([]);
    }
  });

  it("keeps the seed wiki link in the tags section", () => {
    expect(
      findWikiLinkTitlesInText(
        findTagsParagraphText(buildPlaygroundContent("en"), "en"),
      ),
    ).toEqual(["Welcome to Hunos"]);
    expect(
      findWikiLinkTitlesInText(
        findTagsParagraphText(buildPlaygroundContent("zh"), "zh"),
      ),
    ).toEqual(["欢迎使用 Hunos"]);
  });
});

describe("playgroundContentMatchesLocale", () => {
  it("matches doc attrs locale", () => {
    const en = JSON.stringify(buildPlaygroundContent("en"));
    const zh = JSON.stringify(buildPlaygroundContent("zh"));
    expect(playgroundContentMatchesLocale(en, "en")).toBe(true);
    expect(playgroundContentMatchesLocale(en, "zh")).toBe(false);
    expect(playgroundContentMatchesLocale(zh, "zh")).toBe(true);
    expect(playgroundContentMatchesLocale(zh, "en-US")).toBe(false);
  });
});

describe("getFormatPlaygroundTitle", () => {
  it("returns localized playground title", () => {
    expect(getFormatPlaygroundTitle("en")).toBe("Format Playground");
    expect(getFormatPlaygroundTitle("zh")).toBe("格式试炼场");
  });
});

describe("migratePlaygroundContentIfStale", () => {
  it("returns null when playground content version and locale are current", () => {
    const content = JSON.stringify(buildPlaygroundContent("en"));
    expect(migratePlaygroundContentIfStale(content, "en")).toBeNull();
  });

  it("migrates playground content to zh when settings locale is zh", () => {
    const content = JSON.stringify(buildPlaygroundContent("en"));
    const migrated = migratePlaygroundContentIfStale(content, "zh");
    expect(migrated).not.toBeNull();

    const parsed = JSON.parse(migrated!) as {
      attrs?: { playgroundContentLocale?: string };
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    expect(parsed.attrs?.playgroundContentLocale).toBe("zh");
    expect(parsed.content[0]?.content?.[0]?.text).toBe("格式试炼场");
    expect(parsed.content[1]?.content?.[0]?.text).toMatch(/^在这一篇笔记里/);

    const listsSectionIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    expect(listsSectionIndex).toBeGreaterThan(-1);
  });

  it("drops user-added blocks during locale migration (clean slate)", () => {
    const base = buildPlaygroundContent("en") as {
      type: "doc";
      attrs?: Record<string, unknown>;
      content: unknown[];
    };
    base.content.push({
      type: "paragraph",
      content: [{ type: "text", text: "User test block" }],
    });
    const migrated = migratePlaygroundContentIfStale(
      JSON.stringify(base),
      "zh",
    );
    expect(migrated).not.toBeNull();

    const parsed = JSON.parse(migrated!) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    const freshZh = buildPlaygroundContent("zh") as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    expect(parsed.content.length).toBe(freshZh.content.length);
    expect(
      parsed.content.some(
        (node) => node.content?.[0]?.text === "User test block",
      ),
    ).toBe(false);
  });

  it("drops LocaleUndoMarker when migrating zh to en", () => {
    const base = buildPlaygroundContent("zh") as {
      type: "doc";
      attrs?: Record<string, unknown>;
      content: unknown[];
    };
    base.content.push({
      type: "paragraph",
      content: [{ type: "text", text: "LocaleUndoMarker" }],
    });
    const migrated = migratePlaygroundContentIfStale(
      JSON.stringify(base),
      "en",
    );
    expect(migrated).not.toBeNull();

    const parsed = JSON.parse(migrated!) as {
      attrs?: { playgroundContentLocale?: string };
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    expect(parsed.attrs?.playgroundContentLocale).toBe("en");
    expect(parsed.content[0]?.content?.[0]?.text).toBe("Format Playground");
    expect(
      parsed.content.some(
        (node) => node.content?.[0]?.text === "LocaleUndoMarker",
      ),
    ).toBe(false);
  });

  it("preserves user-resized sample image height during locale migration", () => {
    const resizeAndMigrate = (
      fromLocale: "en" | "zh",
      toLocale: "en" | "zh",
      resizedHeight: number,
    ) => {
      const stale = buildPlaygroundContent(fromLocale) as {
        type: "doc";
        content: Array<{
          type: string;
          attrs?: { src?: string; height?: number };
          content?: Array<{ text?: string }>;
        }>;
      };
      const imagesSectionIndex = stale.content.findIndex(
        (node) =>
          node.type === "heading" &&
          node.content?.[0]?.text === (fromLocale === "zh" ? "图片" : "Images"),
      );
      const imageNode = stale.content[imagesSectionIndex + 2];
      if (imageNode?.attrs) {
        imageNode.attrs.height = resizedHeight;
      }

      const migrated = migratePlaygroundContentIfStale(
        JSON.stringify(stale),
        toLocale,
      );
      expect(migrated).not.toBeNull();

      const parsed = JSON.parse(migrated!) as {
        attrs?: { playgroundContentLocale?: string };
        content: Array<{
          type: string;
          attrs?: { src?: string; height?: number; alt?: string };
          content?: Array<{ text?: string }>;
        }>;
      };
      expect(parsed.attrs?.playgroundContentLocale).toBe(toLocale);

      const migratedImagesSectionIndex = parsed.content.findIndex(
        (node) =>
          node.type === "heading" &&
          node.content?.[0]?.text === (toLocale === "zh" ? "图片" : "Images"),
      );
      expect(migratedImagesSectionIndex).toBeGreaterThan(-1);

      const migratedImage = parsed.content[migratedImagesSectionIndex + 2];
      expect(migratedImage?.type).toBe("image");
      expect(migratedImage?.attrs?.src).toBe(PLAYGROUND_SAMPLE_IMAGE_SRC);
      expect(migratedImage?.attrs?.height).toBe(resizedHeight);
      expect(migratedImage?.attrs?.alt).toBe(
        toLocale === "zh" ? "示例" : "Sample",
      );
    };

    resizeAndMigrate("en", "zh", 215);
    resizeAndMigrate("zh", "en", 228);
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
    const tryHintText = findTryHintText(parsed);
    expect(tryHintText).toContain("Cmd+Alt+↑/↓");
    expect(tryHintText).toContain("Cmd+D");
    expect(tryHintText).toContain("Cmd+Shift+K");
    expect(tryHintText).toContain("Cmd+Z");
    expect(tryHintText).toContain("Cmd+Shift+Z");
    expect(tryHintText).toContain("Cmd+F find in note");
    expect(tryHintText).toContain("Cmd+Option+F find and replace");
    expect(tryHintText).toContain("Cmd+Shift+F search all notes");
    expect(tryHintText).toContain(
      "Enter or Backspace at line start on empty blockquote lines to exit the quote",
    );
    expect(tryHintText).toContain(
      "Mod+Enter (or Enter on an empty last code line) to leave code blocks",
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
    const tryHintText = findTryHintText(buildPlaygroundContent("en"));
    expect(tryHintText).toContain("| Name | Type |");
    expect(tryHintText).toContain("Mod+Backspace delete table row");
    expect(tryHintText).toContain("[text](url)");
    expect(tryHintText).toContain("Cmd+K links selected text");
    expect(tryHintText).toContain("Paste or drag-and-drop images");
  });

  it("seeds an Images section with embedded sample image", () => {
    const content = buildPlaygroundContent("en") as {
      content: Array<{
        type: string;
        attrs?: {
          src?: string;
          alt?: string;
          height?: number;
          "data-testid"?: string;
        };
        content?: Array<{ text?: string }>;
      }>;
    };
    const imagesSectionIndex = content.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "Images",
    );
    expect(imagesSectionIndex).toBeGreaterThan(-1);
    const imageNode = content.content[imagesSectionIndex + 2];
    expect(imageNode?.type).toBe("image");
    expect(imageNode?.attrs?.src).toBe(PLAYGROUND_SAMPLE_IMAGE_SRC);
    expect(imageNode?.attrs?.height).toBe(PLAYGROUND_SAMPLE_IMAGE_HEIGHT);
    expect(imageNode?.attrs?.alt).toBe("Sample");
    expect(imageNode?.attrs?.["data-testid"]).toBe(
      PLAYGROUND_SAMPLE_IMAGE_TESTID,
    );
  });

  it("migrates stale v17 playground sample image to visible asset and test id", () => {
    const stale = buildPlaygroundContent("en") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: Array<{
        type: string;
        attrs?: {
          src?: string;
          alt?: string;
          height?: number;
          "data-testid"?: string;
        };
        content?: Array<{ text?: string }>;
      }>;
    };
    stale.attrs = { playgroundContentVersion: 17 };

    const imagesSectionIndex = stale.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "Images",
    );
    const imageNode = stale.content[imagesSectionIndex + 2];
    if (imageNode?.attrs) {
      imageNode.attrs.src = LEGACY_PLAYGROUND_SAMPLE_IMAGE_SRC;
      delete imageNode.attrs["data-testid"];
    }

    const migrated = migratePlaygroundContentIfStale(
      JSON.stringify(stale),
      "en",
    );
    expect(migrated).not.toBeNull();

    const parsed = JSON.parse(migrated!) as {
      attrs?: { playgroundContentVersion?: number };
      content: Array<{
        type: string;
        attrs?: {
          src?: string;
          height?: number;
          "data-testid"?: string;
        };
      }>;
    };
    expect(parsed.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );
    const migratedImage = parsed.content[imagesSectionIndex + 2];
    expect(migratedImage?.attrs?.src).toBe(PLAYGROUND_SAMPLE_IMAGE_SRC);
    expect(migratedImage?.attrs?.["data-testid"]).toBe(
      PLAYGROUND_SAMPLE_IMAGE_TESTID,
    );
    expect(migratedImage?.attrs?.height).toBe(PLAYGROUND_SAMPLE_IMAGE_HEIGHT);
  });

  it("migrates stale v16 playground sample image to default height", () => {
    const stale = buildPlaygroundContent("en") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: Array<{
        type: string;
        attrs?: { src?: string; alt?: string; height?: number };
        content?: Array<{ text?: string }>;
      }>;
    };
    stale.attrs = { playgroundContentVersion: 16 };

    const imagesSectionIndex = stale.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "Images",
    );
    const imageNode = stale.content[imagesSectionIndex + 2];
    if (imageNode?.attrs) {
      delete imageNode.attrs.height;
    }
    expect(imageNode?.attrs?.height).toBeUndefined();

    const migrated = migratePlaygroundContentIfStale(
      JSON.stringify(stale),
      "en",
    );
    expect(migrated).not.toBeNull();

    const parsed = JSON.parse(migrated!) as {
      attrs?: { playgroundContentVersion?: number };
      content: Array<{
        type: string;
        attrs?: { src?: string; height?: number };
      }>;
    };
    expect(parsed.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );
    const migratedImage = parsed.content[imagesSectionIndex + 2];
    expect(migratedImage?.type).toBe("image");
    expect(migratedImage?.attrs?.src).toBe(PLAYGROUND_SAMPLE_IMAGE_SRC);
    expect(migratedImage?.attrs?.height).toBe(PLAYGROUND_SAMPLE_IMAGE_HEIGHT);
  });

  it("preserves user-resized sample image height during version migration", () => {
    const stale = buildPlaygroundContent("zh") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: Array<{
        type: string;
        attrs?: { src?: string; alt?: string; height?: number };
        content?: Array<{ text?: string }>;
      }>;
    };
    stale.attrs = { playgroundContentVersion: 16 };

    const imagesSectionIndex = stale.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "图片",
    );
    const imageNode = stale.content[imagesSectionIndex + 2];
    if (imageNode?.attrs) {
      imageNode.attrs.height = 215;
    }

    const migrated = migratePlaygroundContentIfStale(
      JSON.stringify(stale),
      "zh",
    );
    expect(migrated).not.toBeNull();

    const parsed = JSON.parse(migrated!) as {
      attrs?: { playgroundContentVersion?: number };
      content: Array<{
        type: string;
        attrs?: { src?: string; height?: number };
      }>;
    };
    expect(parsed.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );
    const migratedImage = parsed.content[imagesSectionIndex + 2];
    expect(migratedImage?.attrs?.height).toBe(215);
  });

  it("includes external link sample in tags section", () => {
    const content = buildPlaygroundContent("en") as {
      content: Array<{
        type: string;
        content?: Array<{
          text?: string;
          marks?: Array<{ type: string; attrs?: { href?: string } }>;
        }>;
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
    const tryHintText = findTryHintText(parsed);
    expect(tryHintText).toContain("[text](url)");

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
    const tryHintText = findTryHintText(parsed);
    expect(tryHintText).toContain("| Name | Type |");
    expect(tryHintText).toContain("move between table cells");
  });

  it("includes undo/redo hints in zh seed", () => {
    const tryHintText = findTryHintText(buildPlaygroundContent("zh"));
    expect(tryHintText).toContain("Cmd+Z");
    expect(tryHintText).toContain("| 名称 | 类型 |");
    expect(tryHintText).toContain("Mod+Backspace 删除表格行");
    expect(tryHintText).toContain("[文字](url)");
    expect(tryHintText).toContain("Cmd+Shift+Z");
    expect(tryHintText).toContain("Cmd+F 在笔记内查找");
    expect(tryHintText).toContain("Cmd+Option+F 查找并替换");
    expect(tryHintText).toContain("Cmd+Shift+F 搜索全部笔记");
    expect(tryHintText).toContain("空引用行按 Enter 或行首 Backspace 退出引用");
    expect(tryHintText).toContain(
      "Mod+Enter（或代码块末尾空行连按 Enter）离开代码块",
    );
    expect(tryHintText).toContain("80px 最小高度");
    expect(tryHintText).toContain("点击或轻触内嵌图片");
    expect(tryHintText).toContain("拖动手柄调整大小");
    expect(tryHintText).toContain("括号角标");
  });

  it("updates intro, images section, and tryHint for stale v10 playground notes", () => {
    const stale = buildPlaygroundContent("en") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: unknown[];
    };
    stale.attrs = { playgroundContentVersion: 10 };

    const staleNodes = stale.content as Array<{
      type: string;
      content?: Array<{ text?: string }>;
    }>;
    const imagesSectionIndex = staleNodes.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "Images",
    );
    if (imagesSectionIndex > -1) {
      staleNodes.splice(imagesSectionIndex, 3);
    }
    staleNodes[1] = {
      type: "paragraph",
      content: [
        {
          text: "Test every format in this single note — headings, marks, lists, blocks, tables, tags, and wiki links.",
        },
      ],
    };

    const migrated = migratePlaygroundContentIfStale(
      JSON.stringify(stale),
      "en",
    );
    expect(migrated).not.toBeNull();

    const parsed = JSON.parse(migrated!) as {
      attrs?: { playgroundContentVersion?: number };
      content: Array<{
        type: string;
        attrs?: { src?: string };
        content?: Array<{ text?: string }>;
      }>;
    };
    expect(parsed.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );
    expect(parsed.content[1]?.content?.[0]?.text).toContain("images");
    const migratedImagesIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "Images",
    );
    expect(migratedImagesIndex).toBeGreaterThan(-1);
    expect(parsed.content[migratedImagesIndex + 2]?.type).toBe("image");
    const trySectionIndex = parsed.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "Try Your Own",
    );
    expect(findTryHintText(parsed)).toContain("Paste or drag-and-drop images");
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

  it("seeds task list as two open items then completed for AC restore", () => {
    const content = JSON.parse(
      JSON.stringify(buildPlaygroundContent("en")),
    ) as {
      content: Array<{ type: string; content?: unknown[] }>;
    };
    const taskListNode = content.content.find(
      (node) => node.type === "taskList",
    ) as {
      content: Array<{ attrs: { checked: boolean }; content: unknown[] }>;
    };
    expect(taskListNode).toBeDefined();

    const labels = taskListNode.content.map((item) => {
      const paragraph = item.content[0] as { content: Array<{ text: string }> };
      return paragraph.content[0].text;
    });
    const checked = taskListNode.content.map((item) => item.attrs.checked);

    expect(labels).toEqual(["Open task", "Pending task", "Completed task"]);
    expect(checked).toEqual([false, false, true]);
  });

  it("restores task list seed when migrating stale v12 playground notes", () => {
    const stale = JSON.parse(JSON.stringify(buildPlaygroundContent("en"))) as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: Array<{ type: string; content?: unknown[] }>;
    };
    stale.attrs = { playgroundContentVersion: 12 };

    const taskListIndex = stale.content.findIndex(
      (node) => node.type === "taskList",
    );
    stale.content[taskListIndex] = {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Open task" }],
            },
          ],
        },
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Completed task" }],
            },
          ],
        },
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Pending task" }],
            },
          ],
        },
      ],
    };

    const migrated = migratePlaygroundContentIfStale(
      JSON.stringify(stale),
      "en",
    );
    expect(migrated).not.toBeNull();

    const parsed = JSON.parse(migrated!) as {
      attrs?: { playgroundContentVersion?: number };
      content: Array<{ type: string; content?: unknown[] }>;
    };
    expect(parsed.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );

    const taskListNode = parsed.content.find(
      (node) => node.type === "taskList",
    ) as {
      content: Array<{ attrs: { checked: boolean }; content: unknown[] }>;
    };
    const labels = taskListNode.content.map((item) => {
      const paragraph = item.content[0] as { content: Array<{ text: string }> };
      return paragraph.content[0].text;
    });
    const checked = taskListNode.content.map((item) => item.attrs.checked);

    expect(labels).toEqual(["Open task", "Pending task", "Completed task"]);
    expect(checked).toEqual([false, false, true]);
  });

  it("updates tryHint with blockquote Backspace exit for stale v14 playground notes", () => {
    const stale = buildPlaygroundContent("en") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: unknown[];
    };
    stale.attrs = { playgroundContentVersion: 14 };
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
    const tryHintText = findTryHintText(parsed);
    expect(tryHintText).toContain(
      "Enter or Backspace at line start on empty blockquote lines to exit the quote",
    );
  });

  it("updates tryHint to v16 for stale v15 playground notes", () => {
    const staleEn = buildPlaygroundContent("en") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: unknown[];
    };
    staleEn.attrs = { playgroundContentVersion: 15 };
    staleEn.content = [
      ...(staleEn.content as unknown[]),
      {
        type: "paragraph",
        content: [{ type: "text", text: "user-added block after seed" }],
      },
    ];

    const migratedEn = migratePlaygroundContentIfStale(
      JSON.stringify(staleEn),
      "en",
    );
    expect(migratedEn).not.toBeNull();

    const parsedEn = JSON.parse(migratedEn!) as {
      attrs?: { playgroundContentVersion?: number };
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    expect(parsedEn.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );

    const enTryIndex = parsedEn.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "Try Your Own",
    );
    const enTryHint = findTryHintText(parsedEn);
    expect(enTryHint).toContain(
      "multi-line GFM pipe tables paste as native tables",
    );
    expect(enTryHint).toContain(
      "hide completed tasks in Settings or the info panel",
    );
    expect(enTryHint).toContain("including when the checkbox is focused");
    expect(enTryHint).toContain("invalid URLs show an error toast");
    expect(enTryHint).toContain(
      "Enter or Backspace at line start on empty blockquote lines to exit the quote",
    );
    expect(
      parsedEn.content[parsedEn.content.length - 1]?.content?.[0]?.text,
    ).toBe("user-added block after seed");

    const staleZh = buildPlaygroundContent("zh") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: unknown[];
    };
    staleZh.attrs = { playgroundContentVersion: 15 };
    const migratedZh = migratePlaygroundContentIfStale(
      JSON.stringify(staleZh),
      "zh",
    );
    expect(migratedZh).not.toBeNull();

    const parsedZh = JSON.parse(migratedZh!) as {
      attrs?: { playgroundContentVersion?: number };
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    expect(parsedZh.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );

    const zhTryIndex = parsedZh.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "自由试炼",
    );
    const zhTryHint = findTryHintText(parsedZh);
    expect(zhTryHint).toContain("粘贴");
    expect(zhTryHint).toContain("表格");
    expect(zhTryHint).toContain("管道");
    expect(zhTryHint).toContain("隐藏已完成任务");
    expect(zhTryHint).toContain("设置");
    expect(zhTryHint).toContain("信息面板");
    expect(zhTryHint).toContain("复选框获得焦点");
    expect(zhTryHint).toContain("错误提示");
    expect(zhTryHint).toContain("空引用行按 Enter 或行首 Backspace 退出引用");
  });

  it("updates tryHint to v19 for stale v18 playground notes", () => {
    const staleEn = buildPlaygroundContent("en") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: unknown[];
    };
    staleEn.attrs = { playgroundContentVersion: 18 };
    staleEn.content = [
      ...(staleEn.content as unknown[]),
      {
        type: "paragraph",
        content: [{ type: "text", text: "user-added block after seed" }],
      },
    ];

    const migratedEn = migratePlaygroundContentIfStale(
      JSON.stringify(staleEn),
      "en",
    );
    expect(migratedEn).not.toBeNull();

    const parsedEn = JSON.parse(migratedEn!) as {
      attrs?: { playgroundContentVersion?: number };
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    expect(parsedEn.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );

    const enTryIndex = parsedEn.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "Try Your Own",
    );
    const enTryHint = findTryHintText(parsedEn);
    expect(enTryHint).toContain("minimum height of 80px");
    expect(enTryHint).toContain("click or tap embedded images");
    expect(enTryHint).toContain("resize handle");
    expect(enTryHint).toContain("bracket delimiters reveal at the caret");
    expect(
      parsedEn.content[parsedEn.content.length - 1]?.content?.[0]?.text,
    ).toBe("user-added block after seed");

    const staleZh = buildPlaygroundContent("zh") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: unknown[];
    };
    staleZh.attrs = { playgroundContentVersion: 18 };
    const migratedZh = migratePlaygroundContentIfStale(
      JSON.stringify(staleZh),
      "zh",
    );
    expect(migratedZh).not.toBeNull();

    const parsedZh = JSON.parse(migratedZh!) as {
      attrs?: { playgroundContentVersion?: number };
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    expect(parsedZh.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );

    const zhTryIndex = parsedZh.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "自由试炼",
    );
    const zhTryHint = findTryHintText(parsedZh);
    expect(zhTryHint).toContain("80px 最小高度");
    expect(zhTryHint).toContain("点击或轻触内嵌图片");
    expect(zhTryHint).toContain("拖动手柄调整大小");
    expect(zhTryHint).toContain("括号角标");
  });

  it("seeds tryHint topics in fresh en and zh content", () => {
    const enTryHint = findTryHintText(buildPlaygroundContent("en"));
    expect(enTryHint).toContain("minimum height of 80px");
    expect(enTryHint).toContain("resize handle");
    expect(enTryHint).toContain("bracket delimiters reveal at the caret");

    const zhTryHint = findTryHintText(buildPlaygroundContent("zh"));
    expect(zhTryHint).toContain("80px 最小高度");
    expect(zhTryHint).toContain("点击或轻触内嵌图片");
    expect(zhTryHint).toContain("拖动手柄调整大小");
    expect(zhTryHint).toContain("括号角标");
    expect(enTryHint).toContain("~~strike~~");
    expect(enTryHint).toContain("==highlight==");
    expect(zhTryHint).toContain("~~删除线~~");
    expect(zhTryHint).toContain("==高亮==");
  });

  it("seeds tryHint as bullet list with at least four items", () => {
    for (const locale of ["en", "zh"] as const) {
      const tryHintNode = findTryHintNode(buildPlaygroundContent(locale));
      expect(tryHintNode?.type).toBe("bulletList");
      expect((tryHintNode?.content ?? []).length).toBeGreaterThanOrEqual(4);
    }
  });

  it("updates tryHint to v22 for stale v21 playground notes", () => {
    const staleEn = buildPlaygroundContent("en") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: Array<{ type: string; content?: unknown[] }>;
    };
    staleEn.attrs = { playgroundContentVersion: 21 };
    const staleTryHint = findTryHintNode(staleEn) as {
      content?: Array<{
        content?: Array<{ content?: Array<{ text?: string }> }>;
      }>;
    };
    const wikiBullet = staleTryHint.content?.[4];
    const wikiTextNode = wikiBullet?.content?.[0]?.content?.[0];
    if (wikiTextNode) {
      wikiTextNode.text =
        "Type # for tag autocomplete, or [[ to link notes with autocomplete ([[ and ]] brackets reveal at the caret when editing a wiki link).";
    }

    const migratedEn = migratePlaygroundContentIfStale(
      JSON.stringify(staleEn),
      "en",
    );
    expect(migratedEn).not.toBeNull();

    const parsedEn = JSON.parse(migratedEn!) as {
      attrs?: { playgroundContentVersion?: number };
    };
    expect(parsedEn.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );
    expect(findTryHintText(parsedEn)).toContain(
      "bracket delimiters reveal at the caret",
    );
    expect(findWikiLinkTitlesInText(findTryHintText(parsedEn))).toEqual([]);

    const staleZh = buildPlaygroundContent("zh") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
    };
    staleZh.attrs = { playgroundContentVersion: 21 };
    const staleZhTryHint = findTryHintNode(staleZh) as {
      content?: Array<{
        content?: Array<{ content?: Array<{ text?: string }> }>;
      }>;
    };
    const zhWikiBullet = staleZhTryHint.content?.[4];
    const zhWikiTextNode = zhWikiBullet?.content?.[0]?.content?.[0];
    if (zhWikiTextNode) {
      zhWikiTextNode.text =
        "输入 # 可用标签自动完成，或输入 [[ 链接笔记（编辑已有链接时光标处会显示 [[ 和 ]] 括号）。";
    }

    const migratedZh = migratePlaygroundContentIfStale(
      JSON.stringify(staleZh),
      "zh",
    );
    expect(migratedZh).not.toBeNull();
    expect(findTryHintText(JSON.parse(migratedZh!))).toContain("括号角标");
    expect(
      findWikiLinkTitlesInText(findTryHintText(JSON.parse(migratedZh!))),
    ).toEqual([]);
  });

  it("updates tryHint to v21 for stale v20 playground notes", () => {
    const staleEn = buildPlaygroundContent("en") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: Array<{ type: string; content?: unknown[] }>;
    };
    staleEn.attrs = { playgroundContentVersion: 20 };
    const enTryIndex = staleEn.content.findIndex(
      (node) =>
        node.type === "heading" &&
        (node.content as Array<{ text?: string }> | undefined)?.[0]?.text ===
          "Try Your Own",
    );
    staleEn.content.splice(enTryIndex + 1, 1);

    const migratedEn = migratePlaygroundContentIfStale(
      JSON.stringify(staleEn),
      "en",
    );
    expect(migratedEn).not.toBeNull();

    const parsedEn = JSON.parse(migratedEn!) as {
      attrs?: { playgroundContentVersion?: number };
    };
    expect(parsedEn.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );
    expect(findTryHintText(parsedEn)).toContain("~~strike~~");
    expect(findTryHintText(parsedEn)).toContain("==highlight==");

    const staleZh = buildPlaygroundContent("zh") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: Array<{ type: string; content?: unknown[] }>;
    };
    staleZh.attrs = { playgroundContentVersion: 20 };
    const zhTryIndex = staleZh.content.findIndex(
      (node) =>
        node.type === "heading" &&
        (node.content as Array<{ text?: string }> | undefined)?.[0]?.text ===
          "自由试炼",
    );
    staleZh.content.splice(zhTryIndex + 1, 1);

    const migratedZh = migratePlaygroundContentIfStale(
      JSON.stringify(staleZh),
      "zh",
    );
    expect(migratedZh).not.toBeNull();
    expect(findTryHintText(JSON.parse(migratedZh!))).toContain("~~删除线~~");
    expect(findTryHintText(JSON.parse(migratedZh!))).toContain("==高亮==");
  });

  it("updates tryHint to v20 bullet list for stale v19 playground notes", () => {
    const staleEn = buildPlaygroundContent("en") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: Array<{ type: string; content?: unknown[] }>;
    };
    staleEn.attrs = { playgroundContentVersion: 19 };
    const enTryIndex = staleEn.content.findIndex(
      (node) =>
        node.type === "heading" &&
        (node.content as Array<{ text?: string }> | undefined)?.[0]?.text ===
          "Try Your Own",
    );
    staleEn.content[enTryIndex + 1] = {
      type: "paragraph",
      content: [{ type: "text", text: findTryHintText(staleEn) }],
    };

    const migratedEn = migratePlaygroundContentIfStale(
      JSON.stringify(staleEn),
      "en",
    );
    expect(migratedEn).not.toBeNull();

    const parsedEn = JSON.parse(migratedEn!) as {
      attrs?: { playgroundContentVersion?: number };
      content: Array<{ type: string; content?: unknown[] }>;
    };
    expect(parsedEn.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );
    const migratedTryNode = findTryHintNode(parsedEn);
    expect(migratedTryNode?.type).toBe("bulletList");
    expect((migratedTryNode?.content ?? []).length).toBeGreaterThanOrEqual(4);
    expect(findTryHintText(parsedEn)).toContain("resize handle");

    const staleZh = buildPlaygroundContent("zh") as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: Array<{ type: string; content?: unknown[] }>;
    };
    staleZh.attrs = { playgroundContentVersion: 19 };
    const zhTryIndex = staleZh.content.findIndex(
      (node) =>
        node.type === "heading" &&
        (node.content as Array<{ text?: string }> | undefined)?.[0]?.text ===
          "自由试炼",
    );
    staleZh.content[zhTryIndex + 1] = {
      type: "paragraph",
      content: [{ type: "text", text: findTryHintText(staleZh) }],
    };

    const migratedZh = migratePlaygroundContentIfStale(
      JSON.stringify(staleZh),
      "zh",
    );
    expect(migratedZh).not.toBeNull();

    const parsedZh = JSON.parse(migratedZh!) as {
      attrs?: { playgroundContentVersion?: number };
      content: Array<{ type: string; content?: unknown[] }>;
    };
    expect(parsedZh.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );
    expect(findTryHintNode(parsedZh)?.type).toBe("bulletList");
    expect(findTryHintText(parsedZh)).toContain("80px 最小高度");
    expect(findTryHintText(parsedZh)).toContain("点击或轻触内嵌图片");
    expect(findTryHintText(parsedZh)).toContain("拖动手柄调整大小");
  });

  it("seeds v16 tryHint topics in fresh en and zh content", () => {
    const enTryHint = findTryHintText(buildPlaygroundContent("en"));
    expect(enTryHint).toContain("GFM pipe tables");
    expect(enTryHint).toContain("hide completed tasks");
    expect(enTryHint).toContain("checkbox is focused");
    expect(enTryHint).toContain("error toast");

    const zhTryHint = findTryHintText(buildPlaygroundContent("zh"));
    expect(zhTryHint).toContain("粘贴");
    expect(zhTryHint).toContain("管道表格");
    expect(zhTryHint).toContain("隐藏已完成任务");
    expect(zhTryHint).toContain("复选框获得焦点");
    expect(zhTryHint).toContain("错误提示");
  });

  it("leaves reordered task lists alone when content version is current", () => {
    const edited = JSON.parse(JSON.stringify(buildPlaygroundContent("en"))) as {
      type: "doc";
      attrs?: { playgroundContentVersion?: number };
      content: Array<{ type: string; content?: unknown[] }>;
    };
    const taskListIndex = edited.content.findIndex(
      (node) => node.type === "taskList",
    );
    edited.content[taskListIndex] = {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Open task" }],
            },
          ],
        },
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Completed task" }],
            },
          ],
        },
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Pending task" }],
            },
          ],
        },
      ],
    };

    expect(
      migratePlaygroundContentIfStale(JSON.stringify(edited), "en"),
    ).toBeNull();
  });
});

describe("shouldShowPlaygroundRestoreButton null-row SSOT", () => {
  it("returns false when row is not a playground note (no raw fallback)", () => {
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "Daily",
        storedTitle: "Daily",
        storedContent: '{"type":"doc","content":[]}',
        pendingDraftContent: null,
        fallbackLocale: "en",
      }),
    ).toBe(false);
  });
});

describe("readFormatPlaygroundCanonicalRow", () => {
  it("returns canonical row for unmodified zh seed", () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    const row = readFormatPlaygroundCanonicalRow("格式试炼场", seed, "en");
    expect(row).not.toBeNull();
    expect(row?.seedLocale).toBe("zh");
    expect(row?.canonicalTitle).toBe("格式试炼场");
    expect(row?.isCanonical).toBe(true);
  });

  it("returns non-canonical row when title drifts", () => {
    const seed = JSON.stringify(buildPlaygroundContent("en"));
    const row = readFormatPlaygroundCanonicalRow(
      "NonCanonicalTitleFinal7",
      seed,
      "en",
    );
    expect(row?.isCanonical).toBe(false);
  });

  it("returns non-canonical row when body drifts with T7-MIXED marker", () => {
    const seed = JSON.stringify(buildPlaygroundContent("en"));
    const parsed = JSON.parse(seed) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    parsed.content.splice(10, 0, {
      type: "paragraph",
      content: [{ type: "text", text: "T7-MIXED-lists" }],
    });
    const row = readFormatPlaygroundCanonicalRow(
      "Format Playground",
      JSON.stringify(parsed),
      "en",
    );
    expect(row?.isCanonical).toBe(false);
  });
});

describe("playgroundWriteRegressesCanonicalStored", () => {
  it("blocks drift writes over canonical stored seed", () => {
    const seed = JSON.stringify(buildPlaygroundContent("en"));
    const parsed = JSON.parse(seed) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    parsed.content.push({
      type: "paragraph",
      content: [{ type: "text", text: "T6-MIXED-marker" }],
    });
    expect(
      playgroundWriteRegressesCanonicalStored(
        "Format Playground",
        seed,
        JSON.stringify(parsed),
        "en",
      ),
    ).toBe(true);
  });

  it("allows canonical round-trip writes", () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    expect(
      playgroundWriteRegressesCanonicalStored("格式试炼场", seed, seed, "zh"),
    ).toBe(false);
  });

  it("allows mark-only writes over canonical stored seed", () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          content?: Array<{
            content?: Array<{
              type?: string;
              text?: string;
              marks?: unknown[];
            }>;
          }>;
        }>;
      }>;
    };
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const firstItemText =
      parsed.content[listsIndex + 1]?.content?.[0]?.content?.[0]?.content?.[0];
    if (firstItemText) {
      firstItemText.content = [
        { type: "text", text: "无序列表" },
        { type: "text", text: "第一项", marks: [{ type: "bold" }] },
      ];
    }
    expect(
      playgroundWriteRegressesCanonicalStored(
        "格式试炼场",
        seed,
        JSON.stringify(parsed),
        "zh",
      ),
    ).toBe(false);
  });

  it("allows appended table rows over canonical stored seed (AC5)", () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          type: string;
          content?: Array<{ type: string; content?: unknown[] }>;
        }>;
      }>;
    };
    const tableIndex =
      parsed.content.findIndex(
        (node) => node.type === "heading" && node.content?.[0]?.text === "表格",
      ) + 1;
    const table = parsed.content[tableIndex];
    const templateRow = table?.content?.[1];
    if (!table?.content || !templateRow) throw new Error("seed table missing");
    table.content.push(
      JSON.parse(JSON.stringify(templateRow)) as (typeof table.content)[number],
    );
    const markerCell =
      table.content[3]?.content?.[0]?.content?.[0]?.content?.[0];
    if (markerCell && "text" in markerCell) {
      markerCell.text = "AC27-ROW-marker";
    }
    const edited = JSON.stringify(parsed);

    expect(playgroundContentMatchesQaTableRowAppend(edited, "zh")).toBe(true);
    expect(
      playgroundWriteRegressesCanonicalStored("格式试炼场", seed, edited, "zh"),
    ).toBe(false);
  });

  it("allows in-node text QA writes over canonical stored seed", () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };
    const introParagraph = parsed.content.find(
      (node) =>
        node.type === "paragraph" &&
        node.content?.[0]?.text?.includes("在这一篇笔记里测试所有格式"),
    );
    if (introParagraph?.content?.[0]) {
      introParagraph.content[0].text = `${introParagraph.content[0].text}Q`;
    }
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const firstBulletText =
      parsed.content[listsIndex + 1]?.content?.[0]?.content?.[0]?.content?.[0];
    if (firstBulletText) {
      firstBulletText.text = `${firstBulletText.text}Z`;
    }
    while (
      parsed.content.at(-1)?.type === "paragraph" &&
      !parsed.content.at(-1)?.content?.length
    ) {
      parsed.content.pop();
    }
    const lastParagraph = parsed.content[parsed.content.length - 1];
    if (lastParagraph?.type === "paragraph" && lastParagraph.content?.[0]) {
      lastParagraph.content[0].text = `${lastParagraph.content[0].text ?? ""} T21-doc-end`;
    }
    const edited = JSON.stringify(parsed);
    expect(
      playgroundWriteRegressesCanonicalStored("格式试炼场", seed, edited, "zh"),
    ).toBe(false);
    expect(
      playgroundFormatQaDraftHidesRestoreChip(edited, "格式试炼场", seed, "zh"),
    ).toBe(true);
  });
});

describe("getFormatPlaygroundIntroExcerpt", () => {
  it("returns truncated English seed intro for list preview", () => {
    const excerpt = getFormatPlaygroundIntroExcerpt("en");
    expect(excerpt).toContain("Test every format");
    expect(excerpt.length).toBeLessThanOrEqual(120);
  });

  it("returns truncated zh seed intro for list preview", () => {
    const excerpt = getFormatPlaygroundIntroExcerpt("zh");
    expect(excerpt).toContain("在这一篇笔记里测试所有格式");
    expect(excerpt.length).toBeLessThanOrEqual(120);
  });
});

describe("formatPlayground restore gating", () => {
  it("matches canonical zh seed and detects title or body drift", () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    expect(formatPlaygroundMatchesCanonicalSeed("格式试炼场", seed, "zh")).toBe(
      true,
    );
    expect(formatPlaygroundNeedsRestore("格式试炼场", seed, "zh")).toBe(false);
    expect(
      formatPlaygroundNeedsRestore("NonCanonicalTitleFinal5", seed, "zh"),
    ).toBe(true);

    const parsed = JSON.parse(seed) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    parsed.content.push({
      type: "paragraph",
      content: [{ type: "text", text: "T5-MIXED-body" }],
    });
    const drifted = JSON.stringify(parsed);
    expect(formatPlaygroundNeedsRestore("格式试炼场", drifted, "zh")).toBe(
      true,
    );
  });

  it("tolerates mid-document list reorder when node tree is unchanged (format QA)", () => {
    const seed = JSON.parse(JSON.stringify(buildPlaygroundContent("zh"))) as {
      content: Array<{
        type: string;
        content?: Array<{
          type?: string;
          content?: Array<{ text?: string }>;
        }>;
      }>;
    };
    const listsIndex = seed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const bulletList = seed.content[listsIndex + 1];
    const items = bulletList?.content ?? [];
    if (items.length >= 2) {
      [items[0], items[1]] = [items[1], items[0]];
    }
    const reordered = JSON.stringify(seed);
    expect(
      formatPlaygroundMatchesCanonicalSeed("格式试炼场", reordered, "zh"),
    ).toBe(false);
    expect(formatPlaygroundNeedsRestore("格式试炼场", reordered, "zh")).toBe(
      false,
    );
    expect(
      playgroundFormatQaDraftHidesRestoreChip(
        reordered,
        "格式试炼场",
        JSON.stringify(buildPlaygroundContent("zh")),
        "zh",
      ),
    ).toBe(true);
  });

  it("matches canonical zh seed when app locale is en", () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    expect(resolvePlaygroundSeedLocale(seed, "en")).toBe("zh");
    expect(formatPlaygroundMatchesCanonicalSeed("格式试炼场", seed, "en")).toBe(
      true,
    );
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        pendingDraftContent: null,
        fallbackLocale: "en",
      }),
    ).toBe(false);
  });

  it("treats editor round-trip as matching stored canonical seed", () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    const parsed = JSON.parse(seed) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    while (
      parsed.content.at(-1)?.type === "paragraph" &&
      !parsed.content.at(-1)?.content?.length
    ) {
      parsed.content.pop();
    }
    const editorEcho = JSON.stringify(parsed);
    expect(playgroundEditorContentMatchesStored(editorEcho, seed, "zh")).toBe(
      true,
    );
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        pendingDraftContent: editorEcho,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("treats bold on list text as mark-only when stored seed keeps trailing empty paragraphs", () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          content?: Array<{
            content?: Array<{
              type?: string;
              text?: string;
              marks?: unknown[];
            }>;
          }>;
        }>;
      }>;
    };
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const firstItemParagraph =
      parsed.content[listsIndex + 1]?.content?.[0]?.content?.[0];
    if (firstItemParagraph) {
      firstItemParagraph.content = [
        { type: "text", text: "无序列表" },
        { type: "text", text: "第一项", marks: [{ type: "bold" }] },
      ];
    }
    const marked = JSON.stringify(parsed);
    expect(playgroundEditorMarkOnlyDriftFromStored(marked, seed, "zh")).toBe(
      true,
    );
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        pendingDraftContent: marked,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("does not need restore when persisted row only adds inline marks to seed", () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          content?: Array<{
            content?: Array<{
              type?: string;
              text?: string;
              marks?: unknown[];
            }>;
          }>;
        }>;
      }>;
    };
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const firstItemParagraph =
      parsed.content[listsIndex + 1]?.content?.[0]?.content?.[0];
    if (firstItemParagraph) {
      firstItemParagraph.content = [
        { type: "text", text: "无序列表第一项", marks: [{ type: "bold" }] },
      ];
    }
    const marked = JSON.stringify(parsed);
    expect(formatPlaygroundNeedsRestore("格式试炼场", marked, "zh")).toBe(
      false,
    );
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: marked,
        pendingDraftContent: null,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("still needs restore for renamed title even when body is mark-only drift", () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          content?: Array<{
            content?: Array<{
              type?: string;
              text?: string;
              marks?: unknown[];
            }>;
          }>;
        }>;
      }>;
    };
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const firstItemParagraph =
      parsed.content[listsIndex + 1]?.content?.[0]?.content?.[0];
    if (firstItemParagraph) {
      firstItemParagraph.content = [
        { type: "text", text: "无序列表第一项", marks: [{ type: "bold" }] },
      ];
    }
    const marked = JSON.stringify(parsed);
    expect(formatPlaygroundNeedsRestore("T19-Drift", marked, "zh")).toBe(true);
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "T19-Drift",
        storedTitle: "T19-Drift",
        storedContent: marked,
        pendingDraftContent: null,
        fallbackLocale: "zh",
      }),
    ).toBe(true);
  });

  it("hides restore for canonical zh seed when pending draft only adds inline marks", () => {
    const seed = JSON.stringify(buildPlaygroundContent("zh"));
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          type?: string;
          text?: string;
          marks?: Array<{ type: string }>;
        }>;
      }>;
    };
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const bulletList = parsed.content[listsIndex + 1];
    const secondItem = bulletList?.content?.[1];
    const paragraphNode = secondItem?.content?.[0];
    const textNode = paragraphNode?.content?.[0];
    if (textNode) {
      textNode.marks = [{ type: "bold" }];
    }
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        pendingDraftContent: JSON.stringify(parsed),
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("uses zh sample words in the inline marks demo paragraph", () => {
    const content = buildPlaygroundContent("zh") as {
      content: Array<{
        type: string;
        content?: Array<{ text?: string; marks?: Array<{ type: string }> }>;
      }>;
    };
    const inlineSectionIndex = content.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "行内样式",
    );
    const demoParagraph = content.content[inlineSectionIndex + 1];
    const markedTexts = (demoParagraph?.content ?? [])
      .filter((node) => node.marks?.length)
      .map((node) => node.text);
    expect(markedTexts).toEqual([
      "粗体",
      "斜体",
      "代码",
      "删除线",
      "下划线",
      "高亮",
    ]);
  });
});

describe("restoreFormatPlaygroundContent", () => {
  it("resets content, plain text, and localized title", async () => {
    noteStorageUpdate.mockClear();
    noteStorageGet.mockClear();
    syncNoteLinks.mockClear();
    noteStorageGet.mockResolvedValue(undefined);

    await restoreFormatPlaygroundContent("playground-id", "zh");

    expect(noteStorageUpdate).toHaveBeenCalledOnce();
    const [noteId, payload] = noteStorageUpdate.mock.calls[0] as [
      string,
      { content: string; contentPlain: string; title: string },
    ];
    expect(noteId).toBe("playground-id");
    expect(payload.title).toBe("格式试炼场");

    const parsed = JSON.parse(payload.content) as {
      attrs?: { playgroundContentVersion?: number };
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    expect(parsed.attrs?.playgroundContentVersion).toBe(
      PLAYGROUND_CONTENT_VERSION,
    );
    expect(parsed.content[0]?.content?.[0]?.text).toBe("格式试炼场");
    expect(payload.contentPlain).toContain("格式试炼场");
    expect(syncNoteLinks).toHaveBeenCalledWith(
      "playground-id",
      payload.content,
    );
  });

  it("uses English title when locale is en", async () => {
    noteStorageUpdate.mockClear();
    noteStorageGet.mockResolvedValue(undefined);

    await restoreFormatPlaygroundContent("playground-id", "en");

    const [, payload] = noteStorageUpdate.mock.calls[0] as [
      string,
      { title: string },
    ];
    expect(payload.title).toBe("Format Playground");
  });

  it("restores zh seed from note attrs when app fallback locale is en", async () => {
    noteStorageUpdate.mockClear();
    noteStorageGet.mockResolvedValue({
      id: "playground-id",
      content: JSON.stringify(buildPlaygroundContent("zh")),
    });

    await restoreFormatPlaygroundContent("playground-id", "en");

    const [, payload] = noteStorageUpdate.mock.calls[0] as [
      string,
      { title: string; content: string },
    ];
    expect(payload.title).toBe("格式试炼场");
    expect(JSON.parse(payload.content).attrs?.playgroundContentLocale).toBe(
      "zh",
    );
  });

  it("restores en seed from note attrs when app fallback locale is zh", async () => {
    noteStorageUpdate.mockClear();
    noteStorageGet.mockResolvedValue({
      id: "playground-id",
      content: JSON.stringify(buildPlaygroundContent("en")),
    });

    await restoreFormatPlaygroundContent("playground-id", "zh");

    const [, payload] = noteStorageUpdate.mock.calls[0] as [
      string,
      { title: string; content: string },
    ];
    expect(payload.title).toBe("Format Playground");
    expect(JSON.parse(payload.content).attrs?.playgroundContentLocale).toBe(
      "en",
    );
  });
});

describe("filterNotesForPlaygroundList", () => {
  const enPlayground = {
    id: "pg-en",
    title: "Format Playground",
    content: JSON.stringify(buildPlaygroundContent("en")),
    isPinned: false,
    modifiedAt: 100,
  };
  const zhPlayground = {
    id: "pg-zh",
    title: "格式试炼场",
    content: JSON.stringify(buildPlaygroundContent("zh")),
    isPinned: false,
    modifiedAt: 200,
  };
  const attrMatchDuplicate = {
    id: "pg-dup",
    title: "Playground Copy",
    content: JSON.stringify(buildPlaygroundContent("en")),
    isPinned: false,
    modifiedAt: 50,
  };
  const regularNote = {
    id: "note-1",
    title: "Meeting Notes",
    content: '{"type":"doc","content":[]}',
    isPinned: false,
    modifiedAt: 300,
  };

  it("shows only the zh-canonical playground when locale is zh", () => {
    const notes = [enPlayground, zhPlayground, attrMatchDuplicate, regularNote];
    const filtered = filterNotesForPlaygroundList(notes, "zh");
    expect(filtered.map((n) => n.id)).toEqual(["pg-zh", "pg-dup", "note-1"]);
    expect(filtered.find((n) => n.id === "pg-zh")?.title).toBe("格式试炼场");
  });

  it("shows only the en-canonical playground when locale is en", () => {
    const notes = [enPlayground, zhPlayground, attrMatchDuplicate, regularNote];
    const filtered = filterNotesForPlaygroundList(notes, "en");
    expect(filtered.map((n) => n.id)).toEqual(["pg-en", "pg-dup", "note-1"]);
    expect(filtered.find((n) => n.id === "pg-en")?.title).toBe(
      "Format Playground",
    );
  });

  it("keeps renamed playground copies with custom titles visible", () => {
    const renamedPlayground = {
      id: "pg-renamed",
      title: "TitleUnload3",
      content: JSON.stringify(buildPlaygroundContent("zh")),
      isPinned: true,
      modifiedAt: 400,
    };
    const notes = [zhPlayground, renamedPlayground, regularNote];
    const filtered = filterNotesForPlaygroundList(notes, "zh");
    expect(filtered.map((n) => n.id)).toEqual([
      "pg-zh",
      "pg-renamed",
      "note-1",
    ]);
  });

  it("leaves non-playground notes untouched when no playground exists", () => {
    const filtered = filterNotesForPlaygroundList([regularNote], "zh");
    expect(filtered).toEqual([regularNote]);
  });
});

describe("comparePlaygroundStructuralDrift", () => {
  const seed = JSON.stringify(buildPlaygroundContent("zh"));

  it("returns false for mark-only and in-node text QA edits", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{ type?: string; text?: string; marks?: unknown[] }>;
      }>;
    };
    const introParagraph = parsed.content.find(
      (node) =>
        node.type === "paragraph" &&
        node.content?.[0]?.text?.includes("在这一篇笔记里测试所有格式"),
    );
    if (introParagraph?.content?.[0]) {
      introParagraph.content[0].text = `${introParagraph.content[0].text}Q`;
    }
    const edited = JSON.stringify(parsed);
    expect(comparePlaygroundStructuralDrift(edited, seed, "zh")).toBe(false);
    expect(normalizePlaygroundNodeTreeSnapshot(edited, "zh")).toBe(
      normalizePlaygroundNodeTreeSnapshot(seed, "zh"),
    );
  });

  it("returns true when a new paragraph is inserted", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    parsed.content.push({
      type: "paragraph",
      content: [{ type: "text", text: "T21-MIXED-marker" }],
    });
    expect(
      comparePlaygroundStructuralDrift(JSON.stringify(parsed), seed, "zh"),
    ).toBe(true);
  });

  it("treats TipTap round-trip without trailing empty paragraphs as no drift", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    while (
      parsed.content.at(-1)?.type === "paragraph" &&
      !parsed.content.at(-1)?.content?.length
    ) {
      parsed.content.pop();
    }
    const editorEcho = JSON.stringify(parsed);
    expect(comparePlaygroundStructuralDrift(editorEcho, seed, "zh")).toBe(
      false,
    );
    expect(
      playgroundWriteRegressesCanonicalStored(
        "格式试炼场",
        seed,
        editorEcho,
        "zh",
      ),
    ).toBe(false);
  });

  it("treats captured TipTap editor echo with default attrs as no drift vs stored seed", () => {
    const stored = readFileSync(
      join(process.cwd(), "src/storage/fixtures/playground-zh-stored.json"),
      "utf-8",
    );
    const live = readFileSync(
      join(
        process.cwd(),
        "src/storage/fixtures/playground-zh-tiptap-echo.json",
      ),
      "utf-8",
    );
    expect(comparePlaygroundStructuralDrift(live, stored, "zh")).toBe(false);
    expect(
      playgroundWriteRegressesCanonicalStored("格式试炼场", stored, live, "zh"),
    ).toBe(false);
    expect(
      playgroundFormatQaDraftHidesRestoreChip(live, "格式试炼场", stored, "zh"),
    ).toBe(true);
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: stored,
        pendingDraftContent: live,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("persists in-node QA edits after TipTap strips trailing empty paragraphs", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };
    while (
      parsed.content.at(-1)?.type === "paragraph" &&
      !parsed.content.at(-1)?.content?.length
    ) {
      parsed.content.pop();
    }
    const introParagraph = parsed.content.find(
      (node) =>
        node.type === "paragraph" &&
        node.content?.[0]?.text?.includes("在这一篇笔记里测试所有格式"),
    );
    if (introParagraph?.content?.[0]) {
      introParagraph.content[0].text = `${introParagraph.content[0].text}Q`;
    }
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const firstBulletText =
      parsed.content[listsIndex + 1]?.content?.[0]?.content?.[0]?.content?.[0];
    if (firstBulletText) {
      firstBulletText.text = `${firstBulletText.text}Z`;
    }
    const edited = JSON.stringify(parsed);
    expect(
      playgroundWriteRegressesCanonicalStored("格式试炼场", seed, edited, "zh"),
    ).toBe(false);
    expect(
      playgroundFormatQaDraftHidesRestoreChip(edited, "格式试炼场", seed, "zh"),
    ).toBe(true);
  });
});

describe("playgroundFormatQaMarkOnlyDrift", () => {
  const seed = JSON.stringify(buildPlaygroundContent("zh"));

  function markListItem(itemText: string, markType: "bold" | "italic"): string {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          content?: Array<{
            content?: Array<{ text?: string; marks?: unknown[] }>;
          }>;
        }>;
      }>;
    };
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const bulletList = parsed.content[listsIndex + 1];
    for (const listItem of bulletList?.content ?? []) {
      const paragraph = listItem.content?.[0];
      const textNode = paragraph?.content?.find(
        (node) => node.text === itemText,
      );
      if (textNode) {
        textNode.marks = [{ type: markType }];
        break;
      }
    }
    return JSON.stringify(parsed);
  }

  it("treats bold on 无序列表第一项 as format QA mark-only drift", () => {
    const marked = markListItem("无序列表第一项", "bold");
    expect(
      playgroundFormatQaMarkOnlyDrift(marked, "格式试炼场", seed, "zh"),
    ).toBe(true);
  });

  it("treats italic on 无序列表第二项 as format QA mark-only drift", () => {
    const marked = markListItem("无序列表第二项", "italic");
    expect(
      playgroundFormatQaMarkOnlyDrift(marked, "格式试炼场", seed, "zh"),
    ).toBe(true);
  });

  it("returns false for structural T20-MIXED drift", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    parsed.content.push({
      type: "paragraph",
      content: [{ type: "text", text: "T20-MIXED-marker" }],
    });
    const drifted = JSON.stringify(parsed);
    expect(
      playgroundFormatQaMarkOnlyDrift(drifted, "格式试炼场", seed, "zh"),
    ).toBe(false);
  });
});

describe("playgroundFormatQaStructureMatchesCanonical", () => {
  const seed = JSON.stringify(buildPlaygroundContent("zh"));

  function markListItem(itemText: string, markType: "bold" | "italic"): string {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          content?: Array<{
            content?: Array<{ text?: string; marks?: unknown[] }>;
          }>;
        }>;
      }>;
    };
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const bulletList = parsed.content[listsIndex + 1];
    for (const listItem of bulletList?.content ?? []) {
      const paragraph = listItem.content?.[0];
      const textNode = paragraph?.content?.find(
        (node) => node.text === itemText,
      );
      if (textNode) {
        textNode.marks = [{ type: markType }];
        break;
      }
    }
    return JSON.stringify(parsed);
  }

  it("matches canonical structure when only bold is added", () => {
    const marked = markListItem("无序列表第一项", "bold");
    expect(
      playgroundFormatQaStructureMatchesCanonical(
        marked,
        "格式试炼场",
        seed,
        "zh",
      ),
    ).toBe(true);
  });

  it("does not match when T20-MIXED paragraph is inserted", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    parsed.content.push({
      type: "paragraph",
      content: [{ type: "text", text: "T20-MIXED-marker" }],
    });
    expect(
      playgroundFormatQaStructureMatchesCanonical(
        JSON.stringify(parsed),
        "格式试炼场",
        seed,
        "zh",
      ),
    ).toBe(false);
  });
});

describe("playgroundFormatQaDraftHidesRestoreChip", () => {
  const seed = JSON.stringify(buildPlaygroundContent("zh"));

  it("hides chip for bold on canonical list item", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          content?: Array<{
            content?: Array<{ text?: string; marks?: unknown[] }>;
          }>;
        }>;
      }>;
    };
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const firstItemText =
      parsed.content[listsIndex + 1]?.content?.[0]?.content?.[0]?.content?.[0];
    if (firstItemText) {
      firstItemText.marks = [{ type: "bold" }];
    }
    const marked = JSON.stringify(parsed);
    expect(
      playgroundFormatQaDraftHidesRestoreChip(marked, "格式试炼场", seed, "zh"),
    ).toBe(true);
    expect(formatPlaygroundNeedsRestore("格式试炼场", marked, "zh")).toBe(
      false,
    );
  });

  it("hides chip for bold after TipTap strips trailing empty paragraphs", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          content?: Array<{
            content?: Array<{
              type?: string;
              text?: string;
              marks?: unknown[];
            }>;
          }>;
        }>;
      }>;
    };
    while (
      parsed.content.at(-1)?.type === "paragraph" &&
      !parsed.content.at(-1)?.content?.length
    ) {
      parsed.content.pop();
    }
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const firstItemParagraph =
      parsed.content[listsIndex + 1]?.content?.[0]?.content?.[0];
    if (firstItemParagraph) {
      firstItemParagraph.content = [
        { type: "text", text: "无序列表" },
        { type: "text", text: "第一项", marks: [{ type: "bold" }] },
      ];
    }
    const marked = JSON.stringify(parsed);
    expect(
      playgroundFormatQaDraftHidesRestoreChip(marked, "格式试炼场", seed, "zh"),
    ).toBe(true);
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        pendingDraftContent: marked,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("hides chip for italic on 无序列表第二项 when persisted", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          content?: Array<{
            content?: Array<{ text?: string; marks?: unknown[] }>;
          }>;
        }>;
      }>;
    };
    const listsIndex = parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
    const bulletList = parsed.content[listsIndex + 1];
    for (const listItem of bulletList?.content ?? []) {
      const paragraph = listItem.content?.[0];
      const textNode = paragraph?.content?.find(
        (node) => node.text === "无序列表第二项",
      );
      if (textNode) {
        textNode.marks = [{ type: "italic" }];
        break;
      }
    }
    const marked = JSON.stringify(parsed);
    expect(formatPlaygroundNeedsRestore("格式试炼场", marked, "zh")).toBe(
      false,
    );
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: marked,
        pendingDraftContent: null,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });
});

describe("iter 22 restore chip and persist policy", () => {
  const seed = JSON.stringify(buildPlaygroundContent("zh"));

  function stripTrailingEmptyParagraphs(parsed: {
    content: Array<{ type: string; content?: Array<{ text?: string }> }>;
  }) {
    while (
      parsed.content.at(-1)?.type === "paragraph" &&
      !parsed.content.at(-1)?.content?.length
    ) {
      parsed.content.pop();
    }
  }

  function listsIndex(parsed: {
    content: Array<{ type: string; content?: Array<{ text?: string }> }>;
  }) {
    return parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
  }

  it("allows full QA persist (Q, Z, T22-doc-end-v2) over canonical seed", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };
    const introParagraph = parsed.content.find(
      (node) =>
        node.type === "paragraph" &&
        node.content?.[0]?.text?.includes("在这一篇笔记里测试所有格式"),
    );
    if (introParagraph?.content?.[0]) {
      introParagraph.content[0].text = `${introParagraph.content[0].text}Q`;
    }
    const idx = listsIndex(parsed);
    const firstBulletText =
      parsed.content[idx + 1]?.content?.[0]?.content?.[0]?.content?.[0];
    if (firstBulletText) {
      firstBulletText.text = `${firstBulletText.text}Z`;
    }
    stripTrailingEmptyParagraphs(parsed);
    const lastParagraph = parsed.content[parsed.content.length - 1];
    if (lastParagraph?.type === "paragraph" && lastParagraph.content?.[0]) {
      lastParagraph.content[0].text = `${lastParagraph.content[0].text ?? ""} T22-doc-end-v2`;
    }
    const edited = JSON.stringify(parsed);

    expect(comparePlaygroundStructuralDrift(edited, seed, "zh")).toBe(false);
    expect(
      playgroundWriteRegressesCanonicalStored("格式试炼场", seed, edited, "zh"),
    ).toBe(false);
    expect(
      playgroundFormatQaDraftHidesRestoreChip(edited, "格式试炼场", seed, "zh"),
    ).toBe(true);
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        pendingDraftContent: edited,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("hides chip for trailing T22-doc-end only", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };
    stripTrailingEmptyParagraphs(parsed);
    const lastParagraph = parsed.content[parsed.content.length - 1];
    if (lastParagraph?.type === "paragraph" && lastParagraph.content?.[0]) {
      lastParagraph.content[0].text = `${lastParagraph.content[0].text ?? ""} T22-doc-end`;
    }
    const edited = JSON.stringify(parsed);

    expect(
      playgroundFormatQaDraftHidesRestoreChip(edited, "格式试炼场", seed, "zh"),
    ).toBe(true);
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        pendingDraftContent: edited,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("shows chip for renamed stored title even when pending draft is mark-only", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          content?: Array<{
            content?: Array<{ text?: string; marks?: unknown[] }>;
          }>;
        }>;
      }>;
    };
    const idx = listsIndex(parsed);
    const firstItemText =
      parsed.content[idx + 1]?.content?.[0]?.content?.[0]?.content?.[0];
    if (firstItemText) {
      firstItemText.marks = [{ type: "bold" }];
    }
    const marked = JSON.stringify(parsed);

    expect(
      playgroundTitleDriftedFromCanonical(
        "T22-Drift",
        "T22-Drift",
        null,
        "格式试炼场",
      ),
    ).toBe(true);
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "T22-Drift",
        storedTitle: "T22-Drift",
        storedContent: seed,
        pendingDraftContent: marked,
        fallbackLocale: "zh",
      }),
    ).toBe(true);
  });

  it("shows chip for combined T22-Drift title and T22-MIXED marker", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    const idx = listsIndex(parsed);
    parsed.content.splice(idx + 1, 0, {
      type: "paragraph",
      content: [{ type: "text", text: "T22-MIXED-marker" }],
    });
    const drifted = JSON.stringify(parsed);

    expect(formatPlaygroundNeedsRestore("T22-Drift", drifted, "zh")).toBe(true);
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "T22-Drift",
        storedTitle: "T22-Drift",
        storedContent: drifted,
        pendingDraftContent: null,
        fallbackLocale: "zh",
      }),
    ).toBe(true);
  });

  it("hides chip for post-restore bold on 无序列表第一项", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          content?: Array<{
            content?: Array<{ text?: string; marks?: unknown[] }>;
          }>;
        }>;
      }>;
    };
    const idx = listsIndex(parsed);
    const firstItemText =
      parsed.content[idx + 1]?.content?.[0]?.content?.[0]?.content?.[0];
    if (firstItemText) {
      firstItemText.marks = [{ type: "bold" }];
    }
    const marked = JSON.stringify(parsed);

    expect(
      playgroundFormatQaMarkOnlyDrift(marked, "格式试炼场", seed, "zh"),
    ).toBe(true);
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        pendingDraftContent: marked,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("hides chip for post-restore italic on 无序列表第二项", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          content?: Array<{
            content?: Array<{ text?: string; marks?: unknown[] }>;
          }>;
        }>;
      }>;
    };
    const idx = listsIndex(parsed);
    const bulletList = parsed.content[idx + 1];
    for (const listItem of bulletList?.content ?? []) {
      const paragraph = listItem.content?.[0];
      const textNode = paragraph?.content?.find(
        (node) => node.text === "无序列表第二项",
      );
      if (textNode) {
        textNode.marks = [{ type: "italic" }];
        break;
      }
    }
    const marked = JSON.stringify(parsed);

    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        pendingDraftContent: marked,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });
});

describe("iter 23 drift classifier", () => {
  const seed = JSON.stringify(buildPlaygroundContent("zh"));

  function listsIndex(parsed: {
    content: Array<{ type: string; content?: Array<{ text?: string }> }>;
  }) {
    return parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
  }

  function firstBulletText(parsed: {
    content: Array<{
      type: string;
      content?: Array<{
        content?: Array<{
          content?: Array<{ text?: string }>;
        }>;
      }>;
    }>;
  }) {
    const idx = listsIndex(parsed);
    return parsed.content[idx + 1]?.content?.[0]?.content?.[0]?.content?.[0];
  }

  it("shows chip for T23-MIXED-marker in first unordered list item", () => {
    const parsed = JSON.parse(seed) as Parameters<typeof firstBulletText>[0];
    const textNode = firstBulletText(parsed);
    if (textNode) {
      textNode.text = `${textNode.text} T23-MIXED-marker`;
    }
    const drifted = JSON.stringify(parsed);

    expect(playgroundListsSectionHasMixedMarker(drifted, "zh")).toBe(true);
    expect(
      classifyPlaygroundDrift({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        liveContent: drifted,
        fallbackLocale: "zh",
      }),
    ).toBe("structural");
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        pendingDraftContent: drifted,
        fallbackLocale: "zh",
      }),
    ).toBe(true);
  });

  it("shows chip for T23-Drift title with in-list marker", () => {
    const parsed = JSON.parse(seed) as Parameters<typeof firstBulletText>[0];
    const textNode = firstBulletText(parsed);
    if (textNode) {
      textNode.text = `${textNode.text} T23-MIXED-marker`;
    }
    const drifted = JSON.stringify(parsed);

    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "T23-Drift",
        storedTitle: "T23-Drift",
        storedContent: drifted,
        pendingDraftContent: null,
        fallbackLocale: "zh",
      }),
    ).toBe(true);
  });

  it("hides chip for combined AC2 prep (Q, Z, T23-doc-end-v2)", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };
    const introParagraph = parsed.content.find(
      (node) =>
        node.type === "paragraph" &&
        node.content?.[0]?.text?.includes("在这一篇笔记里测试所有格式"),
    );
    if (introParagraph?.content?.[0]) {
      introParagraph.content[0].text = `${introParagraph.content[0].text}Q`;
    }
    const bullet = firstBulletText(parsed);
    if (bullet) {
      bullet.text = `${bullet.text}Z`;
    }
    const lastParagraph = [...parsed.content]
      .reverse()
      .find((node) => node.type === "paragraph");
    if (lastParagraph) {
      if (!lastParagraph.content?.length) {
        lastParagraph.content = [{ type: "text", text: "T23-doc-end-v2" }];
      } else if (lastParagraph.content[0]) {
        lastParagraph.content[0].text = `${lastParagraph.content[0].text ?? ""} T23-doc-end-v2`;
      }
    }
    const edited = JSON.stringify(parsed);

    expect(
      classifyPlaygroundDrift({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        liveContent: edited,
        fallbackLocale: "zh",
      }),
    ).toBe("qaAc2Prep");
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        pendingDraftContent: edited,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("hides chip for trailing-only T23-doc-end append", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };
    const lastParagraph = [...parsed.content]
      .reverse()
      .find((node) => node.type === "paragraph");
    if (lastParagraph) {
      if (!lastParagraph.content?.length) {
        lastParagraph.content = [{ type: "text", text: "T23-doc-end" }];
      } else if (lastParagraph.content[0]) {
        lastParagraph.content[0].text = `${lastParagraph.content[0].text ?? ""} T23-doc-end`;
      }
    }
    const edited = JSON.stringify(parsed);

    expect(
      classifyPlaygroundDrift({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        liveContent: edited,
        fallbackLocale: "zh",
      }),
    ).toBe("qaTailAppend");
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        pendingDraftContent: edited,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("override layer agrees with shouldShow for structural drift", () => {
    const parsed = JSON.parse(seed) as Parameters<typeof firstBulletText>[0];
    const textNode = firstBulletText(parsed);
    if (textNode) {
      textNode.text = `${textNode.text} T23-MIXED-marker`;
    }
    const drifted = JSON.stringify(parsed);

    expect(
      playgroundRestoreChipOverridesSuppress({
        displayTitle: "T23-Drift",
        storedTitle: "T23-Drift",
        storedContent: drifted,
        pendingDraftContent: drifted,
        fallbackLocale: "zh",
      }),
    ).toBe(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "T23-Drift",
        storedTitle: "T23-Drift",
        storedContent: drifted,
        pendingDraftContent: drifted,
        fallbackLocale: "zh",
      }),
    );
  });
});

describe("playgroundRestoreChipOverridesSuppress", () => {
  const seed = JSON.stringify(buildPlaygroundContent("zh"));

  function listsIndex(parsed: {
    content: Array<{ type: string; content?: Array<{ text?: string }> }>;
  }) {
    return parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "列表",
    );
  }

  it("overrides mark-only suppress for T22-Drift title with mark-only pending draft", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          content?: Array<{
            content?: Array<{ text?: string; marks?: unknown[] }>;
          }>;
        }>;
      }>;
    };
    const idx = listsIndex(parsed);
    const firstItemText =
      parsed.content[idx + 1]?.content?.[0]?.content?.[0]?.content?.[0];
    if (firstItemText) {
      firstItemText.marks = [{ type: "bold" }];
    }
    const marked = JSON.stringify(parsed);

    expect(
      playgroundRestoreChipOverridesSuppress({
        displayTitle: "T22-Drift",
        storedTitle: "T22-Drift",
        storedContent: seed,
        pendingDraftContent: marked,
        fallbackLocale: "zh",
      }),
    ).toBe(true);
  });

  it("overrides suppress for combined T22-Drift title and T22-MIXED marker", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{ type: string; content?: Array<{ text?: string }> }>;
    };
    const idx = listsIndex(parsed);
    parsed.content.splice(idx + 1, 0, {
      type: "paragraph",
      content: [{ type: "text", text: "T22-MIXED-marker" }],
    });
    const drifted = JSON.stringify(parsed);

    expect(
      playgroundRestoreChipOverridesSuppress({
        displayTitle: "T22-Drift",
        storedTitle: "T22-Drift",
        storedContent: drifted,
        pendingDraftContent: drifted,
        fallbackLocale: "zh",
      }),
    ).toBe(true);
  });

  it("does not override suppress for trailing T22-doc-end QA append", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };
    while (
      parsed.content.at(-1)?.type === "paragraph" &&
      !parsed.content.at(-1)?.content?.length
    ) {
      parsed.content.pop();
    }
    const lastParagraph = parsed.content[parsed.content.length - 1];
    if (lastParagraph?.type === "paragraph" && lastParagraph.content?.[0]) {
      lastParagraph.content[0].text = `${lastParagraph.content[0].text ?? ""} T22-doc-end`;
    }
    const edited = JSON.stringify(parsed);

    expect(
      playgroundRestoreChipOverridesSuppress({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        pendingDraftContent: edited,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });
});

describe("iter 27 playground table QA drift", () => {
  const seed = JSON.stringify(buildPlaygroundContent("zh"));

  function tableSectionIndex(parsed: {
    content: Array<{ type: string; content?: Array<{ text?: string }> }>;
  }) {
    return parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "表格",
    );
  }

  it("hides restore chip when only trailing table rows were appended", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          type: string;
          content?: Array<{ type: string; content?: unknown[] }>;
        }>;
      }>;
    };
    const tableIndex = tableSectionIndex(parsed) + 1;
    const table = parsed.content[tableIndex];
    const templateRow = table?.content?.[1];
    if (!table?.content || !templateRow) throw new Error("seed table missing");
    table.content.push(
      JSON.parse(JSON.stringify(templateRow)) as (typeof table.content)[number],
    );
    const edited = JSON.stringify(parsed);

    expect(playgroundContentMatchesQaTableRowAppend(edited, "zh")).toBe(true);
    expect(
      playgroundFormatQaDraftHidesRestoreChip(edited, "格式试炼场", seed, "zh"),
    ).toBe(true);
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        pendingDraftContent: edited,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("classifies appended table rows as qaTableAppend", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          type: string;
          content?: Array<{ type: string; content?: unknown[] }>;
        }>;
      }>;
    };
    const tableIndex = tableSectionIndex(parsed) + 1;
    const table = parsed.content[tableIndex];
    const templateRow = table?.content?.[1];
    if (!table?.content || !templateRow) throw new Error("seed table missing");
    table.content.push(
      JSON.parse(JSON.stringify(templateRow)) as (typeof table.content)[number],
    );
    const edited = JSON.stringify(parsed);

    expect(
      classifyPlaygroundDrift({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: seed,
        liveContent: edited,
        fallbackLocale: "zh",
      }),
    ).toBe("qaTableAppend");
  });

  it("hides restore chip on reload when stored has table rows but live editor is still canonical (AC5)", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          type: string;
          content?: Array<{ type: string; content?: unknown[] }>;
        }>;
      }>;
    };
    const tableIndex = tableSectionIndex(parsed) + 1;
    const table = parsed.content[tableIndex];
    const templateRow = table?.content?.[1];
    if (!table?.content || !templateRow) throw new Error("seed table missing");
    table.content.push(
      JSON.parse(JSON.stringify(templateRow)) as (typeof table.content)[number],
    );
    const stored = JSON.stringify(parsed);

    expect(
      classifyPlaygroundDrift({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: stored,
        liveContent: seed,
        fallbackLocale: "zh",
      }),
    ).toBe("qaTableAppend");
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: stored,
        pendingDraftContent: seed,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
    expect(formatPlaygroundNeedsRestore("格式试炼场", stored, "zh")).toBe(
      false,
    );
  });

  it("hides restore chip when live editor matches stored table row append after reload (AC5)", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          type: string;
          content?: Array<{ type: string; content?: unknown[] }>;
        }>;
      }>;
    };
    const tableIndex = tableSectionIndex(parsed) + 1;
    const table = parsed.content[tableIndex];
    const templateRow = table?.content?.[1];
    if (!table?.content || !templateRow) throw new Error("seed table missing");
    table.content.push(
      JSON.parse(JSON.stringify(templateRow)) as (typeof table.content)[number],
    );
    const stored = JSON.stringify(parsed);

    expect(
      classifyPlaygroundDrift({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: stored,
        liveContent: stored,
        fallbackLocale: "zh",
      }),
    ).toBe("qaTableAppend");
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: stored,
        pendingDraftContent: stored,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("shows restore chip when title renamed to T27-Drift after table row append (AC5-no-false-restore)", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          type: string;
          content?: Array<{ type: string; content?: unknown[] }>;
        }>;
      }>;
    };
    const tableIndex = tableSectionIndex(parsed) + 1;
    const table = parsed.content[tableIndex];
    const templateRow = table?.content?.[1];
    if (!table?.content || !templateRow) throw new Error("seed table missing");
    table.content.push(
      JSON.parse(JSON.stringify(templateRow)) as (typeof table.content)[number],
    );
    const stored = JSON.stringify(parsed);

    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: stored,
        pendingDraftContent: stored,
        fallbackLocale: "zh",
      }),
    ).toBe(false);

    expect(
      classifyPlaygroundDrift({
        displayTitle: "T27-Drift",
        storedTitle: "T27-Drift",
        storedContent: stored,
        liveContent: stored,
        fallbackLocale: "zh",
      }),
    ).toBe("titleDrift");
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "T27-Drift",
        storedTitle: "T27-Drift",
        storedContent: stored,
        pendingDraftContent: stored,
        fallbackLocale: "zh",
      }),
    ).toBe(true);
  });

  it("hides restore chip when persisted stored row was sanitized like IDB write (AC5-spurious-restore-chip)", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          type: string;
          content?: Array<{ type: string; content?: unknown[] }>;
        }>;
      }>;
    };
    const tableIndex = tableSectionIndex(parsed) + 1;
    const table = parsed.content[tableIndex];
    const templateRow = table?.content?.[1];
    if (!table?.content || !templateRow) throw new Error("seed table missing");
    table.content.push(
      JSON.parse(JSON.stringify(templateRow)) as (typeof table.content)[number],
    );
    const stored = playgroundPersistedContentForRow(JSON.stringify(parsed));

    expect(playgroundContentMatchesQaTableRowAppend(stored, "zh")).toBe(true);
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: stored,
        pendingDraftContent: seed,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("hides restore chip when TipTap table cell attrs differ from seed (AC5-no-false-restore)", () => {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        attrs?: Record<string, unknown>;
        content?: Array<{
          type: string;
          attrs?: Record<string, unknown>;
          content?: Array<{
            type: string;
            attrs?: Record<string, unknown>;
            content?: unknown[];
          }>;
        }>;
      }>;
    };
    const tableIndex = tableSectionIndex(parsed) + 1;
    const table = parsed.content[tableIndex];
    if (!table?.content) throw new Error("seed table missing");

    for (const row of table.content) {
      for (const cell of row.content ?? []) {
        cell.attrs = { colspan: 1, rowspan: 1, colwidth: null };
      }
    }

    const templateRow = table.content[1];
    if (!templateRow) throw new Error("seed table missing template row");
    const extraRow = JSON.parse(
      JSON.stringify(templateRow),
    ) as typeof templateRow;
    const markerCell = extraRow.content?.[0];
    if (markerCell) {
      markerCell.content = [
        {
          type: "paragraph",
          content: [{ type: "text", text: "AC27-ROW-persist" }],
        },
        { type: "paragraph" },
      ];
    }
    table.content.push(extraRow);

    const edited = JSON.stringify(parsed);
    const stored = playgroundPersistedContentForRow(edited);

    expect(playgroundContentMatchesQaTableRowAppend(stored, "zh")).toBe(true);
    expect(
      classifyPlaygroundDrift({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: stored,
        liveContent: edited,
        fallbackLocale: "zh",
      }),
    ).toBe("qaTableAppend");
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: stored,
        pendingDraftContent: edited,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });
});

describe("iter 28 playground table row persist compare", () => {
  const seed = JSON.stringify(buildPlaygroundContent("zh"));

  function tableSectionIndex(parsed: {
    content: Array<{ type: string; content?: Array<{ text?: string }> }>;
  }) {
    return parsed.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "表格",
    );
  }

  function appendTableRowWithMarker(marker: string) {
    const parsed = JSON.parse(seed) as {
      content: Array<{
        type: string;
        content?: Array<{
          type: string;
          attrs?: Record<string, unknown>;
          content?: Array<{
            type: string;
            attrs?: Record<string, unknown>;
            content?: unknown[];
          }>;
        }>;
      }>;
    };
    const tableIndex = tableSectionIndex(parsed) + 1;
    const table = parsed.content[tableIndex];
    const templateRow = table?.content?.[1];
    if (!table?.content || !templateRow) throw new Error("seed table missing");
    const extraRow = JSON.parse(
      JSON.stringify(templateRow),
    ) as (typeof table.content)[number];
    const markerCell = extraRow.content?.[0];
    if (markerCell) {
      markerCell.content = [
        {
          type: "paragraph",
          content: [{ type: "text", text: marker }],
        },
        { type: "paragraph" },
      ];
    }
    for (const row of table.content) {
      for (const cell of row.content ?? []) {
        cell.attrs = { colspan: 1, rowspan: 1, colwidth: null };
      }
    }
    for (const cell of extraRow.content ?? []) {
      cell.attrs = { colspan: 1, rowspan: 1, colwidth: null };
    }
    table.content.push(extraRow);
    return JSON.stringify(parsed);
  }

  it("treats TipTap table attrs as equal under persist compare (AC5-no-false-restore)", () => {
    const edited = appendTableRowWithMarker("AC28-ROW-persist");
    const stored = playgroundPersistedContentForRow(edited);
    const rawEditor = edited;

    expect(playgroundPersistCompareContentsEqual(rawEditor, stored, "zh")).toBe(
      true,
    );
    expect(
      classifyPlaygroundDrift({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: stored,
        liveContent: rawEditor,
        fallbackLocale: "zh",
      }),
    ).toBe("qaTableAppend");
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: stored,
        pendingDraftContent: rawEditor,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("hides restore chip when IDB matches editor after trailing in-cell paragraph drift", () => {
    const edited = appendTableRowWithMarker("AC28-ROW-persist");
    const parsed = JSON.parse(edited) as {
      content: Array<{
        content?: Array<{
          content?: Array<{ content?: Array<{ type: string }> }>;
        }>;
      }>;
    };
    const table = parsed.content[tableSectionIndex(parsed) + 1];
    const markCell = table?.content?.[1]?.content?.[1];
    if (markCell) {
      markCell.content = [...(markCell.content ?? []), { type: "paragraph" }];
    }
    const stored = playgroundPersistedContentForRow(JSON.stringify(parsed));
    const live = JSON.stringify(parsed);

    expect(playgroundContentMatchesQaTableRowAppend(stored, "zh")).toBe(true);
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "格式试炼场",
        storedTitle: "格式试炼场",
        storedContent: stored,
        pendingDraftContent: live,
        fallbackLocale: "zh",
      }),
    ).toBe(false);
  });

  it("shows restore chip when title renamed to T28-Drift after table row append (AC5-no-false-restore guard)", () => {
    const stored = playgroundPersistedContentForRow(
      appendTableRowWithMarker("AC28-ROW-persist"),
    );

    expect(
      classifyPlaygroundDrift({
        displayTitle: "T28-Drift",
        storedTitle: "T28-Drift",
        storedContent: stored,
        liveContent: stored,
        fallbackLocale: "zh",
      }),
    ).toBe("titleDrift");
    expect(
      shouldShowPlaygroundRestoreButton({
        displayTitle: "T28-Drift",
        storedTitle: "T28-Drift",
        storedContent: stored,
        pendingDraftContent: stored,
        fallbackLocale: "zh",
      }),
    ).toBe(true);
  });

  it("uses playgroundEditorContentMatchesStored with table persist compare snapshot", () => {
    const edited = appendTableRowWithMarker("AC28-ROW-marker");
    const stored = playgroundPersistedContentForRow(edited);
    expect(playgroundEditorContentMatchesStored(edited, stored, "zh")).toBe(
      true,
    );
  });
});
