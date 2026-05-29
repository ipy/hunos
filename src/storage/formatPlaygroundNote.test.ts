import { describe, expect, it, vi } from "vitest";
import {
  PLAYGROUND_CONTENT_VERSION,
  buildPlaygroundContent,
  getFormatPlaygroundTitle,
  isFormatPlaygroundNote,
  migratePlaygroundContentIfStale,
  restoreFormatPlaygroundContent,
} from "./formatPlaygroundNote";

const noteStorageUpdate = vi.fn();
const syncNoteLinks = vi.fn();

vi.mock("./noteStorage", () => ({
  noteStorage: {
    update: (...args: unknown[]) => noteStorageUpdate(...args),
  },
}));

vi.mock("@/graph/graphEngine", () => ({
  graphEngine: {
    syncNoteLinks: (...args: unknown[]) => syncNoteLinks(...args),
  },
}));

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

  it("preserves user-added blocks after the seed when migrating locale", () => {
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
    const last = parsed.content[parsed.content.length - 1];
    expect(last?.content?.[0]?.text).toBe("User test block");
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
    expect(tryHintNode?.content?.[0]?.text).toContain(
      "Enter or Backspace at line start on empty blockquote lines to exit the quote",
    );
    expect(tryHintNode?.content?.[0]?.text).toContain(
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
    expect(tryHintNode?.content?.[0]?.text).toContain(
      "Cmd+K links selected text",
    );
    expect(tryHintNode?.content?.[0]?.text).toContain(
      "paste or drag-and-drop images",
    );
  });

  it("seeds an Images section with embedded sample image", () => {
    const content = buildPlaygroundContent("en") as {
      content: Array<{
        type: string;
        attrs?: { src?: string; alt?: string };
        content?: Array<{ text?: string }>;
      }>;
    };
    const imagesSectionIndex = content.content.findIndex(
      (node) => node.type === "heading" && node.content?.[0]?.text === "Images",
    );
    expect(imagesSectionIndex).toBeGreaterThan(-1);
    const imageNode = content.content[imagesSectionIndex + 2];
    expect(imageNode?.type).toBe("image");
    expect(imageNode?.attrs?.src).toMatch(/^data:image\/png;base64,/);
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
    expect(tryHintNode?.content?.[0]?.text).toContain(
      "空引用行按 Enter 或行首 Backspace 退出引用",
    );
    expect(tryHintNode?.content?.[0]?.text).toContain(
      "Mod+Enter（或代码块末尾空行连按 Enter）离开代码块",
    );
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
    expect(parsed.content[trySectionIndex + 1]?.content?.[0]?.text).toContain(
      "paste or drag-and-drop images",
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
    const tryHintNode = parsed.content[trySectionIndex + 1];
    expect(tryHintNode?.content?.[0]?.text).toContain(
      "Enter or Backspace at line start on empty blockquote lines to exit the quote",
    );
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

describe("restoreFormatPlaygroundContent", () => {
  it("resets content, plain text, and localized title", async () => {
    noteStorageUpdate.mockClear();
    syncNoteLinks.mockClear();

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

    await restoreFormatPlaygroundContent("playground-id", "en");

    const [, payload] = noteStorageUpdate.mock.calls[0] as [
      string,
      { title: string },
    ];
    expect(payload.title).toBe("Format Playground");
  });
});
