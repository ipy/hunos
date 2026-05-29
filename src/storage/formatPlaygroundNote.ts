import { noteStorage } from "./noteStorage";
import { graphEngine } from "@/graph/graphEngine";
import { extractPlainTextFromTiptap } from "@/graph/linkExtractor";
import { PLAYGROUND_SAMPLE_IMAGE_SRC } from "@/components/editor/imageEmbedUtils";
import type { Locale } from "@/types/settings";

type PlaygroundLocale = "en" | "zh";

export const PLAYGROUND_CONTENT_VERSION = 13;

export const FORMAT_PLAYGROUND_TITLES: readonly string[] = [
  "Format Playground",
  "格式试炼场",
];

interface PlaygroundStrings {
  title: string;
  intro: string;
  sectionHeadings: string;
  sectionInline: string;
  sectionLists: string;
  sectionBlocks: string;
  sectionImages: string;
  sectionTable: string;
  sectionTags: string;
  sectionTry: string;
  h1Sample: string;
  h2Sample: string;
  h3Sample: string;
  inlinePrefix: string;
  inlineSuffix: string;
  bullet1: string;
  bullet2: string;
  bullet3: string;
  ordered1: string;
  ordered2: string;
  ordered3: string;
  taskOpen: string;
  taskDone: string;
  taskPending: string;
  quote: string;
  codeSample: string;
  imagesIntro: string;
  imageSampleAlt: string;
  tableH1: string;
  tableH2: string;
  tableH3: string;
  tableA1: string;
  tableA2: string;
  tableA3: string;
  tableB1: string;
  tableB2: string;
  tableB3: string;
  tagsText: string;
  tag: string;
  wikiLink: string;
  tagsExternalPrefix: string;
  tagsExternalLabel: string;
  tagsExternalSuffix: string;
  tryHint: string;
}

const STRINGS: Record<PlaygroundLocale, PlaygroundStrings> = {
  en: {
    title: "Format Playground",
    intro:
      "Test every format in this single note — headings, marks, lists, blocks, images, tables, tags, and wiki links. Scroll through each section or use the TOC in the info panel.",
    sectionHeadings: "Headings",
    sectionInline: "Inline Marks",
    sectionLists: "Lists",
    sectionBlocks: "Blocks",
    sectionImages: "Images",
    sectionTable: "Table",
    sectionTags: "Tags & Links",
    sectionTry: "Try Your Own",
    h1Sample: "Heading 1",
    h2Sample: "Heading 2",
    h3Sample: "Heading 3",
    inlinePrefix: "Mix ",
    inlineSuffix: " in one line.",
    bullet1: "Unordered item one",
    bullet2: "Unordered item two",
    bullet3: "Unordered item three",
    ordered1: "First ordered item",
    ordered2: "Second ordered item",
    ordered3: "Third ordered item",
    taskOpen: "Open task",
    taskDone: "Completed task",
    taskPending: "Pending task",
    quote: "A blockquote for emphasis or citations.",
    codeSample:
      'function greet(name) {\n  return "Hello, " + name;\n}\n\nconst hello = greet("world");',
    imagesIntro:
      "Embedded sample image (paste or drag-and-drop your own below).",
    imageSampleAlt: "Sample",
    tableH1: "Name",
    tableH2: "Type",
    tableH3: "Status",
    tableA1: "Bold",
    tableA2: "Mark",
    tableA3: "Ready",
    tableB1: "Lists",
    tableB2: "Block",
    tableB3: "Done",
    tagsText: "Organize with ",
    tag: "#format-test",
    wikiLink: "[[Welcome to Hunos]]",
    tagsExternalPrefix: " See ",
    tagsExternalLabel: "project docs",
    tagsExternalSuffix: " for more.",
    tryHint:
      "Add new blocks below — type # / ## / ### , - , 1. , - [ ] , > , ``` , --- , | Name | Type | for tables, type [text](url) for external links (bare URLs linkify on space), paste or drag-and-drop images (PNG/JPG, max 5 MB), type # for tag autocomplete, or [[ to link notes with autocomplete. Checking a task moves it to the bottom of the list; unchecking moves it back above completed items. Desktop shortcuts: Cmd+B/I/Shift+X/K (Cmd+K links selected text), Cmd+Enter for tasks (or add table row in cells), Tab / Shift+Tab to nest lists or move between table cells, Mod+Shift+Enter add table column, Mod+Backspace delete table row, Mod+Shift+Backspace delete table column, Cmd+Alt+↑/↓ to move lines, Cmd+D to duplicate line, Cmd+Shift+K to delete line, Cmd+Z / Cmd+Shift+Z to undo and redo, Enter on empty list items to outdent or exit, Backspace at line start to outdent nested items, Cmd+N new note, Cmd+F find in note, Cmd+Option+F find and replace, Cmd+Shift+F search all notes.",
  },
  zh: {
    title: "格式试炼场",
    intro:
      "在这一篇笔记里测试所有格式——标题、行内样式、列表、块级元素、图片、表格、标签与双向链接。可滚动各分区，或在信息面板的目录中快速跳转。",
    sectionHeadings: "标题",
    sectionInline: "行内样式",
    sectionLists: "列表",
    sectionBlocks: "块级元素",
    sectionImages: "图片",
    sectionTable: "表格",
    sectionTags: "标签与链接",
    sectionTry: "自由试炼",
    h1Sample: "一级标题",
    h2Sample: "二级标题",
    h3Sample: "三级标题",
    inlinePrefix: "混排 ",
    inlineSuffix: " 于同一行。",
    bullet1: "无序列表第一项",
    bullet2: "无序列表第二项",
    bullet3: "无序列表第三项",
    ordered1: "有序列表第一项",
    ordered2: "有序列表第二项",
    ordered3: "有序列表第三项",
    taskOpen: "未完成任务",
    taskDone: "已完成任务",
    taskPending: "待办任务",
    quote: "引用块，用于强调或引用。",
    codeSample:
      'function greet(name) {\n  return "Hello, " + name;\n}\n\nconst hello = greet("world");',
    imagesIntro: "内嵌示例图片（可在下方粘贴或拖放自己的图片）。",
    imageSampleAlt: "示例",
    tableH1: "名称",
    tableH2: "类型",
    tableH3: "状态",
    tableA1: "粗体",
    tableA2: "样式",
    tableA3: "就绪",
    tableB1: "列表",
    tableB2: "块",
    tableB3: "完成",
    tagsText: "用 ",
    tag: "#格式测试",
    wikiLink: "[[欢迎使用 Hunos]]",
    tagsExternalPrefix: " 详见 ",
    tagsExternalLabel: "项目文档",
    tagsExternalSuffix: "。",
    tryHint:
      "在下方空行试输入 # / ## / ### 、- 、1. 、- [ ] 、> 、``` 、--- 、| 名称 | 类型 | 创建表格，输入 [文字](url) 创建外部链接（裸 URL 输入空格后自动链接），粘贴或拖放图片（PNG/JPG，最大 5 MB），输入 # 可用标签自动完成，或输入 [[ 链接笔记。勾选任务会将其移到列表底部，取消勾选会移回已完成项上方。桌面快捷键：Cmd+B/I/Shift+X/K（Cmd+K 为选中文本加链接）、Cmd+Enter 切换任务（或在表格单元格内添加行）、Tab / Shift+Tab 嵌套列表或在表格单元格间移动、Mod+Shift+Enter 添加表格列、Mod+Backspace 删除表格行、Mod+Shift+Backspace 删除表格列、Cmd+Alt+↑/↓ 移动行、Cmd+D 复制行、Cmd+Shift+K 删除行、Cmd+Z / Cmd+Shift+Z 撤销与重做、空列表项按 Enter 降级或退出列表、行首 Backspace 降级嵌套项、Cmd+N 新建笔记、Cmd+F 在笔记内查找、Cmd+Option+F 查找并替换、Cmd+Shift+F 搜索全部笔记。",
  },
};

function text(
  value: string,
  marks?: { type: string; attrs?: Record<string, unknown> }[],
) {
  return marks
    ? { type: "text", marks, text: value }
    : { type: "text", text: value };
}

function externalLinkText(label: string, href: string) {
  return text(label, [
    {
      type: "link",
      attrs: {
        href,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    },
  ]);
}

function heading(level: number, value: string) {
  return { type: "heading", attrs: { level }, content: [text(value)] };
}

function paragraph(...content: ReturnType<typeof text>[]) {
  return { type: "paragraph", content };
}

function listItem(...content: unknown[]) {
  return { type: "listItem", content };
}

function taskItem(checked: boolean, value: string) {
  return {
    type: "taskItem",
    attrs: { checked },
    content: [paragraph(text(value))],
  };
}

function tableCell(type: "tableHeader" | "tableCell", value: string) {
  return { type, content: [paragraph(text(value))] };
}

function tableRow(cells: ReturnType<typeof tableCell>[]) {
  return { type: "tableRow", content: cells };
}

function resolvePlaygroundLocale(locale: Locale): PlaygroundLocale {
  return locale === "zh" ? "zh" : "en";
}

export function isFormatPlaygroundNote(
  title: string,
  content?: string,
): boolean {
  if (FORMAT_PLAYGROUND_TITLES.includes(title)) return true;
  if (!content) return false;
  try {
    const parsed = JSON.parse(content) as PlaygroundDoc;
    if (parsed.type !== "doc") return false;
    return parsed.attrs?.playgroundContentVersion != null;
  } catch {
    return false;
  }
}

export function buildPlaygroundContent(locale: Locale) {
  const s = STRINGS[resolvePlaygroundLocale(locale)];

  return {
    type: "doc",
    attrs: { playgroundContentVersion: PLAYGROUND_CONTENT_VERSION },
    content: [
      heading(1, s.title),
      paragraph(text(s.intro)),

      heading(2, s.sectionHeadings),
      heading(1, s.h1Sample),
      heading(2, s.h2Sample),
      heading(3, s.h3Sample),

      heading(2, s.sectionInline),
      paragraph(
        text(s.inlinePrefix),
        text("bold", [{ type: "bold" }]),
        text(", "),
        text("italic", [{ type: "italic" }]),
        text(", "),
        text("code", [{ type: "code" }]),
        text(", "),
        text("strike", [{ type: "strike" }]),
        text(", "),
        text("underline", [{ type: "underline" }]),
        text(", "),
        text("highlight", [{ type: "highlight" }]),
        text(s.inlineSuffix),
      ),

      heading(2, s.sectionLists),
      {
        type: "bulletList",
        content: [
          listItem(paragraph(text(s.bullet1))),
          listItem(paragraph(text(s.bullet2))),
          listItem(paragraph(text(s.bullet3))),
        ],
      },
      {
        type: "orderedList",
        content: [
          listItem(paragraph(text(s.ordered1))),
          listItem(paragraph(text(s.ordered2))),
          listItem(paragraph(text(s.ordered3))),
        ],
      },
      {
        type: "taskList",
        content: [
          taskItem(false, s.taskOpen),
          taskItem(false, s.taskPending),
          taskItem(true, s.taskDone),
        ],
      },

      heading(2, s.sectionBlocks),
      {
        type: "blockquote",
        content: [paragraph(text(s.quote))],
      },
      {
        type: "codeBlock",
        attrs: { language: "javascript" },
        content: [text(s.codeSample)],
      },
      { type: "horizontalRule" },

      heading(2, s.sectionImages),
      paragraph(text(s.imagesIntro)),
      {
        type: "image",
        attrs: {
          src: PLAYGROUND_SAMPLE_IMAGE_SRC,
          alt: s.imageSampleAlt,
        },
      },

      heading(2, s.sectionTable),
      {
        type: "table",
        content: [
          tableRow([
            tableCell("tableHeader", s.tableH1),
            tableCell("tableHeader", s.tableH2),
            tableCell("tableHeader", s.tableH3),
          ]),
          tableRow([
            tableCell("tableCell", s.tableA1),
            tableCell("tableCell", s.tableA2),
            tableCell("tableCell", s.tableA3),
          ]),
          tableRow([
            tableCell("tableCell", s.tableB1),
            tableCell("tableCell", s.tableB2),
            tableCell("tableCell", s.tableB3),
          ]),
        ],
      },

      heading(2, s.sectionTags),
      paragraph(
        text(s.tagsText),
        text(s.tag),
        text(" and link to "),
        text(s.wikiLink),
        text("."),
        text(s.tagsExternalPrefix),
        externalLinkText(s.tagsExternalLabel, "https://example.com"),
        text(s.tagsExternalSuffix),
      ),

      heading(2, s.sectionTry),
      paragraph(text(s.tryHint)),
      paragraph(),
      paragraph(),
    ],
  };
}

export async function restoreFormatPlaygroundContent(
  noteId: string,
  locale: Locale,
): Promise<void> {
  const content = buildPlaygroundContent(locale);
  const contentStr = JSON.stringify(content);
  const contentPlain = extractPlainTextFromTiptap(content);

  await noteStorage.update(noteId, {
    content: contentStr,
    contentPlain,
  });
  await graphEngine.syncNoteLinks(noteId, contentStr);
}

export async function createFormatPlaygroundNote(
  locale: Locale,
): Promise<void> {
  const playgroundLocale = resolvePlaygroundLocale(locale);
  const content = buildPlaygroundContent(locale);
  const contentPlain = extractPlainTextFromTiptap(content);
  const s = STRINGS[playgroundLocale];

  const note = await noteStorage.create({
    content: JSON.stringify(content),
    title: s.title,
    contentPlain,
    isPinned: true,
  });

  await graphEngine.syncNoteLinks(note.id, note.content);
}

export function resolveSeedLocale(): PlaygroundLocale {
  return navigator.language.startsWith("zh") ? "zh" : "en";
}

type PlaygroundDocNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PlaygroundDocNode[];
  text?: string;
};

type PlaygroundDoc = {
  type: "doc";
  attrs?: { playgroundContentVersion?: number };
  content: PlaygroundDocNode[];
};

function headingText(node: PlaygroundDocNode): string {
  return (node.content ?? []).map((child) => child.text ?? "").join("");
}

function readPlaygroundContentVersion(content: string): number | null {
  try {
    const parsed = JSON.parse(content) as PlaygroundDoc;
    if (parsed.type !== "doc") {
      return null;
    }
    return parsed.attrs?.playgroundContentVersion ?? 0;
  } catch {
    return null;
  }
}

/** Refresh stale tryHint copy when playground seed version lags; preserves user edits elsewhere. */
export function migratePlaygroundContentIfStale(
  content: string,
  locale: Locale,
): string | null {
  const version = readPlaygroundContentVersion(content);
  if (version === null || version >= PLAYGROUND_CONTENT_VERSION) {
    return null;
  }

  let parsed: PlaygroundDoc;
  try {
    parsed = JSON.parse(content) as PlaygroundDoc;
  } catch {
    return null;
  }

  if (parsed.type !== "doc" || !Array.isArray(parsed.content)) {
    return null;
  }

  const s = STRINGS[resolvePlaygroundLocale(locale)];
  const contentNodes = [...parsed.content];

  const introNode = contentNodes[1];
  if (introNode?.type === "paragraph") {
    contentNodes[1] = paragraph(text(s.intro));
  }

  const hasImagesSection = contentNodes.some(
    (node) =>
      node.type === "heading" &&
      node.attrs?.level === 2 &&
      headingText(node) === s.sectionImages,
  );

  if (!hasImagesSection) {
    const tableSectionIndex = contentNodes.findIndex(
      (node) =>
        node.type === "heading" &&
        node.attrs?.level === 2 &&
        headingText(node) === s.sectionTable,
    );
    if (tableSectionIndex > -1) {
      contentNodes.splice(
        tableSectionIndex,
        0,
        heading(2, s.sectionImages),
        paragraph(text(s.imagesIntro)),
        {
          type: "image",
          attrs: {
            src: PLAYGROUND_SAMPLE_IMAGE_SRC,
            alt: s.imageSampleAlt,
          },
        },
      );
    }
  }

  for (let i = 0; i < contentNodes.length; i += 1) {
    const node = contentNodes[i];
    if (node.type !== "heading" || node.attrs?.level !== 2) {
      continue;
    }
    if (headingText(node) === s.sectionTry) {
      const tryHintNode = contentNodes[i + 1];
      if (tryHintNode?.type === "paragraph") {
        contentNodes[i + 1] = paragraph(text(s.tryHint));
      }
    }
    if (headingText(node) === s.sectionTags) {
      const tagsNode = contentNodes[i + 1];
      if (tagsNode?.type === "paragraph") {
        contentNodes[i + 1] = paragraph(
          text(s.tagsText),
          text(s.tag),
          text(" and link to "),
          text(s.wikiLink),
          text("."),
          text(s.tagsExternalPrefix),
          externalLinkText(s.tagsExternalLabel, "https://example.com"),
          text(s.tagsExternalSuffix),
        );
      }
    }
    if (headingText(node) === s.sectionBlocks) {
      for (let j = i + 1; j < contentNodes.length; j += 1) {
        const blockNode = contentNodes[j];
        if (blockNode.type === "heading") {
          break;
        }
        if (blockNode.type === "codeBlock") {
          contentNodes[j] = {
            type: "codeBlock",
            attrs: { language: "javascript" },
            content: [text(s.codeSample)],
          };
          break;
        }
      }
    }
    if (headingText(node) === s.sectionLists) {
      for (let j = i + 1; j < contentNodes.length; j += 1) {
        const listNode = contentNodes[j];
        if (listNode.type === "heading") {
          break;
        }
        if (listNode.type === "taskList") {
          contentNodes[j] = {
            type: "taskList",
            content: [
              taskItem(false, s.taskOpen),
              taskItem(false, s.taskPending),
              taskItem(true, s.taskDone),
            ],
          };
          break;
        }
      }
    }
  }

  const updated: PlaygroundDoc = {
    ...parsed,
    attrs: {
      ...parsed.attrs,
      playgroundContentVersion: PLAYGROUND_CONTENT_VERSION,
    },
    content: contentNodes,
  };

  return JSON.stringify(updated);
}
