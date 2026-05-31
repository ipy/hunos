import { noteStorage } from "./noteStorage";
import { graphEngine } from "@/graph/graphEngine";
import { useNoteStore } from "@/store/noteStore";
import { extractPlainTextFromTiptap } from "@/graph/linkExtractor";
import {
  isPlaygroundSampleImageSrc,
  PLAYGROUND_SAMPLE_IMAGE_HEIGHT,
  PLAYGROUND_SAMPLE_IMAGE_SRC,
  PLAYGROUND_SAMPLE_IMAGE_TESTID,
} from "@/components/editor/imageEmbedUtils";
import type { Locale } from "@/types/settings";
import { sanitizeBlockImageNoteContent } from "@/utils/migrateBlockImageFloor";

type PlaygroundLocale = "en" | "zh";

export const PLAYGROUND_CONTENT_VERSION = 24;

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
  inlineBold: string;
  inlineItalic: string;
  inlineCode: string;
  inlineStrike: string;
  inlineUnderline: string;
  inlineHighlight: string;
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
  tagsWikiLinkGlue: string;
  wikiLink: string;
  tagsWikiLinkEnd: string;
  tagsExternalPrefix: string;
  tagsExternalLabel: string;
  tagsExternalSuffix: string;
  tryHintBullets: readonly string[];
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
    inlineBold: "bold",
    inlineItalic: "italic",
    inlineCode: "code",
    inlineStrike: "strike",
    inlineUnderline: "underline",
    inlineHighlight: "highlight",
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
    tag: "#hunos/format-test",
    tagsWikiLinkGlue: " and link to ",
    wikiLink: "[[Welcome to Hunos]]",
    tagsWikiLinkEnd: ".",
    tagsExternalPrefix: " See ",
    tagsExternalLabel: "project docs",
    tagsExternalMid: " and ",
    tagsExternalSuffix: " for more.",
    tryHintBullets: [
      "Type **bold**, _italic_, __underline__, ~~strike~~, `code`, or ==highlight== for inline marks.",
      "Add new blocks below — type # / ## / ### , - , 1. , - [ ] , > , ``` , --- for headings, lists, quotes, code, and dividers.",
      "Type or paste | Name | Type | for tables (multi-line GFM pipe tables paste as native tables), type [text](url) for external links (invalid URLs show an error toast; bare URLs linkify on space).",
      "Paste or drag-and-drop images (PNG/JPG, max 5 MB; very small images display at a minimum height of 80px), click or tap embedded images to select them and drag the resize handle to adjust size.",
      "Type # for tag autocomplete, or type double-bracket syntax to link notes with autocomplete (bracket delimiters reveal at the caret when editing a wiki link).",
      "Checking a task moves it to the bottom of the list; unchecking moves it back above completed items — hide completed tasks in Settings or the info panel.",
      "Desktop shortcuts: Cmd+B/I/Shift+X/K (Cmd+K links selected text), Cmd+Enter toggles tasks (including when the checkbox is focused, or add table row in cells), Tab / Shift+Tab to nest lists or move between table cells, Mod+Shift+Enter add table column, Mod+Backspace delete table row, Mod+Shift+Backspace delete table column, Cmd+Alt+↑/↓ to move lines, Cmd+D to duplicate line, Cmd+Shift+K to delete line, Cmd+Z / Cmd+Shift+Z to undo and redo, Enter on empty list items to outdent or exit, Enter or Backspace at line start on empty blockquote lines to exit the quote, Mod+Enter (or Enter on an empty last code line) to leave code blocks, Backspace at line start to outdent nested items, Cmd+N new note, Cmd+F find in note, Cmd+Option+F find and replace, Cmd+Shift+F search all notes.",
    ],
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
    inlineBold: "粗体",
    inlineItalic: "斜体",
    inlineCode: "代码",
    inlineStrike: "删除线",
    inlineUnderline: "下划线",
    inlineHighlight: "高亮",
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
    tag: "#hunos/格式测试",
    tagsWikiLinkGlue: " 并链接 ",
    wikiLink: "[[欢迎使用 Hunos]]",
    tagsWikiLinkEnd: "。",
    tagsExternalPrefix: " 详见 ",
    tagsExternalLabel: "项目文档",
    tagsExternalMid: " 与 ",
    tagsExternalSuffix: "。",
    tryHintBullets: [
      "输入 **粗体**、_斜体_、__下划线__、~~删除线~~、`代码` 或 ==高亮== 等行内样式。",
      "在下方空行试输入 # / ## / ### 、- 、1. 、- [ ] 、> 、``` 、--- 创建标题、列表、引用、代码块与分隔线。",
      "输入 | 名称 | 类型 | 创建表格，或直接粘贴多行 GFM 管道表格为原生表格，输入 [文字](url) 创建外部链接（无效 URL 会显示错误提示；裸 URL 输入空格后自动链接）。",
      "粘贴或拖放图片（PNG/JPG，最大 5 MB；极小的图片会以 80px 最小高度显示），点击或轻触内嵌图片可选中并拖动手柄调整大小。",
      "输入 # 可用标签自动完成，或用双方括号语法链接笔记（编辑已有链接时光标处会显示括号角标）。",
      "勾选任务会将其移到列表底部，取消勾选会移回已完成项上方；可在设置或信息面板开启隐藏已完成任务。",
      "桌面快捷键：Cmd+B/I/Shift+X/K（Cmd+K 为选中文本加链接）、Cmd+Enter 切换任务（复选框获得焦点时同样生效，或在表格单元格内添加行）、Tab / Shift+Tab 嵌套列表或在表格单元格间移动、Mod+Shift+Enter 添加表格列、Mod+Backspace 删除表格行、Mod+Shift+Backspace 删除表格列、Cmd+Alt+↑/↓ 移动行、Cmd+D 复制行、Cmd+Shift+K 删除行、Cmd+Z / Cmd+Shift+Z 撤销与重做、空列表项按 Enter 降级或退出列表、空引用行按 Enter 或行首 Backspace 退出引用、Mod+Enter（或代码块末尾空行连按 Enter）离开代码块、行首 Backspace 降级嵌套项、Cmd+N 新建笔记、Cmd+F 在笔记内查找、Cmd+Option+F 查找并替换、Cmd+Shift+F 搜索全部笔记。",
    ],
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

function heading(level: number, value: string) {
  return { type: "heading", attrs: { level }, content: [text(value)] };
}

function paragraph(...content: ReturnType<typeof text>[]) {
  return { type: "paragraph", content };
}

function listItem(...content: unknown[]) {
  return { type: "listItem", content };
}

function tryHintBulletList(bullets: readonly string[]) {
  return {
    type: "bulletList",
    content: bullets.map((bullet) => listItem(paragraph(text(bullet)))),
  };
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

  const playgroundLocale = resolvePlaygroundLocale(locale);

  return {
    type: "doc",
    attrs: {
      playgroundContentVersion: PLAYGROUND_CONTENT_VERSION,
      playgroundContentLocale: playgroundLocale,
    },
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
        text(s.inlineBold, [{ type: "bold" }]),
        text(", "),
        text(s.inlineItalic, [{ type: "italic" }]),
        text(", "),
        text(s.inlineCode, [{ type: "code" }]),
        text(", "),
        text(s.inlineStrike, [{ type: "strike" }]),
        text(", "),
        text(s.inlineUnderline, [{ type: "underline" }]),
        text(", "),
        text(s.inlineHighlight, [{ type: "highlight" }]),
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
          height: PLAYGROUND_SAMPLE_IMAGE_HEIGHT,
          "data-testid": PLAYGROUND_SAMPLE_IMAGE_TESTID,
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
        text(s.tagsWikiLinkGlue),
        text(s.wikiLink),
        text(s.tagsWikiLinkEnd),
        text(s.tagsExternalPrefix),
        text(`[[${s.tagsExternalLabel}]]`),
        text(s.tagsExternalMid),
        text(`[[${s.tagsExternalLabel}]]`),
        text(s.tagsExternalSuffix),
      ),

      heading(2, s.sectionTry),
      tryHintBulletList(s.tryHintBullets),
      paragraph(),
      paragraph(),
    ],
  };
}

export async function restoreFormatPlaygroundContent(
  noteId: string,
  fallbackLocale: Locale,
): Promise<void> {
  const existing = await noteStorage.get(noteId);
  const seedLocale = existing?.content
    ? resolvePlaygroundSeedLocale(existing.content, fallbackLocale)
    : resolvePlaygroundLocale(fallbackLocale);
  const content = buildPlaygroundContent(seedLocale);
  const contentStr = JSON.stringify(content);
  const contentPlain = extractPlainTextFromTiptap(content);
  const title = getFormatPlaygroundTitle(seedLocale);

  await noteStorage.update(noteId, {
    content: contentStr,
    contentPlain,
    title,
  });
  await graphEngine.syncNoteLinks(noteId, contentStr);
}

function stripTrailingEmptyParagraphs(
  nodes: PlaygroundDocNode[],
): PlaygroundDocNode[] {
  const result = [...nodes];
  while (result.length > 0) {
    const last = result[result.length - 1];
    if (last.type !== "paragraph") break;
    const text = (last.content ?? []).map((child) => child.text ?? "").join("");
    if (text.length > 0) break;
    result.pop();
  }
  return result;
}

function normalizePlaygroundDocForFingerprint(
  parsed: PlaygroundDoc,
  seedLocale: PlaygroundLocale,
): PlaygroundDoc {
  const content = stripTrailingEmptyParagraphs(parsed.content).map((node) => {
    const migratedImage = migratePlaygroundSampleImageNode(node);
    return migratedImage ?? node;
  });
  return {
    type: "doc",
    attrs: {
      playgroundContentVersion: PLAYGROUND_CONTENT_VERSION,
      playgroundContentLocale: seedLocale,
    },
    content,
  };
}

function stripPlaygroundInlineMarks(
  node: PlaygroundDocNode,
): PlaygroundDocNode {
  if (node.type === "text") {
    return { type: "text", text: node.text ?? "" };
  }
  if (!node.content?.length) {
    return node;
  }
  return {
    ...node,
    content: node.content.map(stripPlaygroundInlineMarks),
  };
}

function coalesceAdjacentTextNodes(
  nodes: PlaygroundDocNode[],
): PlaygroundDocNode[] {
  const coalesced: PlaygroundDocNode[] = [];
  for (const node of nodes) {
    let next = node;
    if (next.content?.length) {
      next = {
        ...next,
        content: coalesceAdjacentTextNodes(next.content),
      };
    }
    const previous = coalesced[coalesced.length - 1];
    if (next.type === "text" && previous?.type === "text") {
      previous.text = (previous.text ?? "") + (next.text ?? "");
      continue;
    }
    coalesced.push(next);
  }
  return coalesced;
}

function normalizePlaygroundDocStructureForFingerprint(
  parsed: PlaygroundDoc,
  seedLocale: PlaygroundLocale,
): PlaygroundDoc {
  const stripped: PlaygroundDoc = {
    ...parsed,
    content: coalesceAdjacentTextNodes(
      parsed.content.map(stripPlaygroundInlineMarks),
    ),
  };
  return normalizePlaygroundDocForFingerprint(stripped, seedLocale);
}

/** Structure + text fingerprint ignoring inline marks — for format QA restore gating. */
export function normalizePlaygroundStructureSnapshot(
  content: string,
  locale: Locale,
): string {
  const migrated = migratePlaygroundContentIfStale(content, locale) ?? content;
  try {
    const parsed = JSON.parse(migrated) as PlaygroundDoc;
    if (parsed.type !== "doc" || !Array.isArray(parsed.content)) {
      return migrated;
    }
    const seedLocale = resolvePlaygroundSeedLocale(migrated, locale);
    return JSON.stringify(
      normalizePlaygroundDocStructureForFingerprint(parsed, seedLocale),
    );
  } catch {
    return migrated;
  }
}

function stripTextFromPlaygroundNode(
  node: PlaygroundDocNode,
): PlaygroundDocNode | null {
  if (node.type === "text") {
    return null;
  }
  const content = node.content?.length
    ? stripTextFromPlaygroundNodes(node.content)
    : undefined;
  return { type: node.type, content: content?.length ? content : undefined };
}

/** Keep only attrs that affect doc structure; TipTap default attrs are ignored. */
function normalizePlaygroundStructuralNodeForFingerprint(
  node: PlaygroundDocNode,
): PlaygroundDocNode {
  const structuralAttrsByType: Record<string, readonly string[]> = {
    heading: ["level"],
    taskItem: ["checked"],
    codeBlock: ["language"],
  };
  const allowed = structuralAttrsByType[node.type];
  const next: PlaygroundDocNode = { type: node.type };
  if (allowed?.length && node.attrs) {
    const attrs: Record<string, unknown> = {};
    for (const key of allowed) {
      if (node.attrs[key] !== undefined) {
        attrs[key] = node.attrs[key];
      }
    }
    if (Object.keys(attrs).length > 0) {
      next.attrs = attrs;
    }
  }
  if (node.content?.length) {
    next.content = node.content.map(
      normalizePlaygroundStructuralNodeForFingerprint,
    );
  }
  return next;
}

function stripTextFromPlaygroundNodes(
  nodes: PlaygroundDocNode[],
): PlaygroundDocNode[] {
  return nodes
    .map((node) => stripTextFromPlaygroundNode(node))
    .filter((node): node is PlaygroundDocNode => node != null);
}

function normalizePlaygroundDocNodeTreeForFingerprint(
  parsed: PlaygroundDoc,
  seedLocale: PlaygroundLocale,
): PlaygroundDoc {
  const content = stripTextFromPlaygroundNodes(
    stripTrailingEmptyParagraphs(parsed.content),
  ).map((node) => {
    const migratedImage = migratePlaygroundSampleImageNode(node);
    return normalizePlaygroundStructuralNodeForFingerprint(
      migratedImage ?? node,
    );
  });
  return {
    type: "doc",
    attrs: {
      playgroundContentVersion: PLAYGROUND_CONTENT_VERSION,
      playgroundContentLocale: seedLocale,
    },
    content,
  };
}

/** Node-type tree fingerprint — ignores inline marks and text content. */
export function normalizePlaygroundNodeTreeSnapshot(
  content: string,
  locale: Locale,
): string {
  const migrated = migratePlaygroundContentIfStale(content, locale) ?? content;
  try {
    const parsed = JSON.parse(migrated) as PlaygroundDoc;
    if (parsed.type !== "doc" || !Array.isArray(parsed.content)) {
      return migrated;
    }
    const seedLocale = resolvePlaygroundSeedLocale(migrated, locale);
    return JSON.stringify(
      normalizePlaygroundDocNodeTreeForFingerprint(parsed, seedLocale),
    );
  } catch {
    return migrated;
  }
}

const PLAYGROUND_MIXED_MARKER_RE = /T\d+-MIXED(?:-marker)?/i;
const PLAYGROUND_QA_TAIL_APPEND_RE = /T\d+-doc-end(?!-v\d)/i;
const PLAYGROUND_QA_AC2_TAIL_RE = /T\d+-doc-end-v2/i;

function collectPlaygroundNodeText(node: PlaygroundDocNode): string {
  if (node.type === "text") {
    return node.text ?? "";
  }
  return (node.content ?? []).map(collectPlaygroundNodeText).join("");
}

type PlaygroundQaAnchors = {
  intro: string;
  bullet1: string;
  lastParagraph: string;
};

function extractPlaygroundQaAnchors(
  content: string,
  fallbackLocale: Locale,
): PlaygroundQaAnchors | null {
  const row = playgroundPersistedContentForRow(content);
  if (!row) return null;
  try {
    const parsed = JSON.parse(row) as PlaygroundDoc;
    if (parsed.type !== "doc" || !Array.isArray(parsed.content)) {
      return null;
    }
    const seedLocale = resolvePlaygroundSeedLocale(row, fallbackLocale);
    const s = STRINGS[seedLocale];
    const introPrefix = s.intro.slice(0, 24);

    let intro = "";
    let bullet1 = "";
    let listsHeadingIndex = -1;

    for (let i = 0; i < parsed.content.length; i += 1) {
      const node = parsed.content[i];
      if (
        !intro &&
        node.type === "paragraph" &&
        collectPlaygroundNodeText(node).includes(introPrefix)
      ) {
        intro = collectPlaygroundNodeText(node);
      }
      if (
        listsHeadingIndex < 0 &&
        node.type === "heading" &&
        collectPlaygroundNodeText(node) === s.sectionLists
      ) {
        listsHeadingIndex = i;
      }
      if (listsHeadingIndex >= 0 && i === listsHeadingIndex + 1) {
        if (node.type === "bulletList") {
          const firstItem = node.content?.[0];
          if (firstItem) {
            bullet1 = collectPlaygroundNodeText(firstItem);
          }
        }
      }
    }

    let lastParagraph = "";
    for (let i = parsed.content.length - 1; i >= 0; i -= 1) {
      const node = parsed.content[i];
      if (node.type === "paragraph") {
        lastParagraph = collectPlaygroundNodeText(node);
        break;
      }
    }

    return { intro, bullet1, lastParagraph };
  } catch {
    return null;
  }
}

/** True when a Lists-section list item contains a Txx-MIXED QA drift marker. */
export function playgroundListsSectionHasMixedMarker(
  content: string,
  fallbackLocale: Locale,
): boolean {
  const row = playgroundPersistedContentForRow(content);
  if (!row) return false;
  try {
    const parsed = JSON.parse(row) as PlaygroundDoc;
    if (parsed.type !== "doc" || !Array.isArray(parsed.content)) {
      return false;
    }
    const seedLocale = resolvePlaygroundSeedLocale(row, fallbackLocale);
    const s = STRINGS[seedLocale];
    const listsHeadingIndex = parsed.content.findIndex(
      (node) =>
        node.type === "heading" &&
        collectPlaygroundNodeText(node) === s.sectionLists,
    );
    if (listsHeadingIndex < 0) return false;

    for (let i = listsHeadingIndex + 1; i < parsed.content.length; i += 1) {
      const node = parsed.content[i];
      if (node.type === "heading") break;
      if (node.type !== "bulletList" && node.type !== "orderedList") {
        continue;
      }
      const listText = collectPlaygroundNodeText(node);
      if (PLAYGROUND_MIXED_MARKER_RE.test(listText)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

function playgroundTailQaAnchorsMatchCanonical(
  liveContent: string,
  fallbackLocale: Locale,
): boolean {
  const seedLocale = resolvePlaygroundSeedLocale(liveContent, fallbackLocale);
  const anchors = extractPlaygroundQaAnchors(liveContent, seedLocale);
  if (!anchors) return false;
  const s = STRINGS[seedLocale];
  return anchors.intro === s.intro && anchors.bullet1 === s.bullet1;
}

function playgroundContentMatchesQaAc2Prep(
  liveContent: string,
  fallbackLocale: Locale,
): boolean {
  if (playgroundListsSectionHasMixedMarker(liveContent, fallbackLocale)) {
    return false;
  }
  const seedLocale = resolvePlaygroundSeedLocale(liveContent, fallbackLocale);
  const anchors = extractPlaygroundQaAnchors(liveContent, seedLocale);
  if (!anchors) return false;
  const s = STRINGS[seedLocale];
  return (
    anchors.intro.endsWith("Q") &&
    anchors.intro.startsWith(s.intro) &&
    anchors.bullet1.endsWith("Z") &&
    anchors.bullet1.startsWith(s.bullet1) &&
    PLAYGROUND_QA_AC2_TAIL_RE.test(anchors.lastParagraph)
  );
}

function playgroundContentMatchesQaTailAppend(
  liveContent: string,
  fallbackLocale: Locale,
): boolean {
  if (playgroundListsSectionHasMixedMarker(liveContent, fallbackLocale)) {
    return false;
  }
  if (!playgroundTailQaAnchorsMatchCanonical(liveContent, fallbackLocale)) {
    return false;
  }
  const seedLocale = resolvePlaygroundSeedLocale(liveContent, fallbackLocale);
  const anchors = extractPlaygroundQaAnchors(liveContent, seedLocale);
  if (!anchors) return false;
  return (
    PLAYGROUND_QA_TAIL_APPEND_RE.test(anchors.lastParagraph) &&
    !PLAYGROUND_QA_AC2_TAIL_RE.test(anchors.lastParagraph)
  );
}

function findPlaygroundTrySectionStartIndex(
  nodes: PlaygroundDocNode[],
  seedLocale: PlaygroundLocale,
): number {
  const sectionTry = STRINGS[seedLocale].sectionTry;
  return nodes.findIndex(
    (node) =>
      node.type === "heading" && collectPlaygroundNodeText(node) === sectionTry,
  );
}

/** True when structural drift is confined to the Try Your Own / 自由试炼 sandbox (heading onward). */
export function playgroundDriftConfinedToTrySandbox(
  liveContent: string,
  fallbackLocale: Locale,
): boolean {
  const liveRow = playgroundPersistedContentForRow(liveContent);
  if (!liveRow) return false;

  try {
    const parsed = JSON.parse(liveRow) as PlaygroundDoc;
    if (parsed.type !== "doc" || !Array.isArray(parsed.content)) {
      return false;
    }

    const seedLocale = resolvePlaygroundSeedLocale(liveRow, fallbackLocale);
    const tryStart = findPlaygroundTrySectionStartIndex(
      parsed.content,
      seedLocale,
    );
    if (tryStart < 0) return false;

    const sandboxText = parsed.content
      .slice(tryStart)
      .map(collectPlaygroundNodeText)
      .join("\n");
    if (
      PLAYGROUND_MIXED_MARKER_RE.test(sandboxText) ||
      PLAYGROUND_QA_TAIL_APPEND_RE.test(sandboxText) ||
      PLAYGROUND_QA_AC2_TAIL_RE.test(sandboxText)
    ) {
      return false;
    }

    const canonical = buildPlaygroundContent(seedLocale) as PlaygroundDoc;
    const livePrefix = parsed.content.slice(0, tryStart);
    const canonicalPrefix = canonical.content.slice(0, tryStart);

    const livePrefixDoc: PlaygroundDoc = {
      type: "doc",
      attrs: {
        playgroundContentVersion: PLAYGROUND_CONTENT_VERSION,
        playgroundContentLocale: seedLocale,
      },
      content: livePrefix,
    };
    const canonicalPrefixDoc: PlaygroundDoc = {
      type: "doc",
      attrs: {
        playgroundContentVersion: PLAYGROUND_CONTENT_VERSION,
        playgroundContentLocale: seedLocale,
      },
      content: canonicalPrefix,
    };

    return (
      normalizePlaygroundNodeTreeSnapshot(
        JSON.stringify(livePrefixDoc),
        seedLocale,
      ) ===
      normalizePlaygroundNodeTreeSnapshot(
        JSON.stringify(canonicalPrefixDoc),
        seedLocale,
      )
    );
  } catch {
    return false;
  }
}

function findPlaygroundSeedTable(
  parsed: PlaygroundDoc,
  seedLocale: PlaygroundLocale,
): PlaygroundDocNode | null {
  const s = STRINGS[seedLocale];
  const tableHeadingIndex = parsed.content.findIndex(
    (node) =>
      node.type === "heading" &&
      collectPlaygroundNodeText(node) === s.sectionTable,
  );
  if (tableHeadingIndex < 0) return null;
  const tableNode = parsed.content[tableHeadingIndex + 1];
  return tableNode?.type === "table" ? tableNode : null;
}

function stripTipTapTableCellAttrs(node: PlaygroundDocNode): PlaygroundDocNode {
  if (
    (node.type === "tableCell" || node.type === "tableHeader") &&
    node.attrs
  ) {
    const { attrs: _attrs, ...rest } = node;
    const next: PlaygroundDocNode = { ...rest };
    if (node.content?.length) {
      next.content = node.content.map(stripTipTapTableCellAttrs);
    }
    return next;
  }
  if (!node.content?.length) {
    return node;
  }
  return {
    ...node,
    content: node.content.map(stripTipTapTableCellAttrs),
  };
}

/** TipTap leaves a trailing empty paragraph after in-cell typing — ignore for QA row match. */
function stripTrailingEmptyParagraphsInTableCells(
  row: PlaygroundDocNode,
): PlaygroundDocNode {
  if (row.type !== "tableRow" || !row.content?.length) {
    return row;
  }
  return {
    ...row,
    content: row.content.map((cell) => {
      if (
        (cell.type !== "tableCell" && cell.type !== "tableHeader") ||
        !cell.content?.length
      ) {
        return cell;
      }
      let paragraphs = [...cell.content];
      while (paragraphs.length > 1) {
        const last = paragraphs[paragraphs.length - 1];
        if (last.type !== "paragraph") {
          break;
        }
        const text = (last.content ?? [])
          .map((child) => child.text ?? "")
          .join("");
        if (text.length > 0) {
          break;
        }
        paragraphs = paragraphs.slice(0, -1);
      }
      return { ...cell, content: paragraphs };
    }),
  };
}

function normalizePlaygroundTableRowForQaFingerprint(
  row: PlaygroundDocNode,
): PlaygroundDocNode {
  return stripTipTapTableCellAttrs(
    stripTrailingEmptyParagraphsInTableCells(row),
  );
}

function normalizePlaygroundTableNodeForPersistCompare(
  table: PlaygroundDocNode,
): PlaygroundDocNode {
  if (table.type !== "table" || !table.content?.length) {
    return table;
  }
  return {
    ...table,
    content: table.content.map(normalizePlaygroundTableRowForQaFingerprint),
  };
}

function normalizePlaygroundDocForPersistCompare(
  parsed: PlaygroundDoc,
  seedLocale: PlaygroundLocale,
): PlaygroundDoc {
  const content = parsed.content.map((node) =>
    node.type === "table"
      ? normalizePlaygroundTableNodeForPersistCompare(node)
      : node,
  );
  return normalizePlaygroundDocForFingerprint(
    { ...parsed, content },
    seedLocale,
  );
}

/** IDB vs editor equality — table cell attrs and trailing in-cell paragraphs ignored. */
export function normalizePlaygroundPersistCompareSnapshot(
  content: string,
  fallbackLocale: Locale,
): string {
  const migrated =
    migratePlaygroundContentIfStale(content, fallbackLocale) ?? content;
  try {
    const parsed = JSON.parse(migrated) as PlaygroundDoc;
    if (parsed.type !== "doc" || !Array.isArray(parsed.content)) {
      return migrated;
    }
    const seedLocale = resolvePlaygroundSeedLocale(migrated, fallbackLocale);
    return JSON.stringify(
      normalizePlaygroundDocForPersistCompare(parsed, seedLocale),
    );
  } catch {
    return migrated;
  }
}

export function playgroundPersistCompareContentsEqual(
  a: string,
  b: string,
  fallbackLocale: Locale,
): boolean {
  return (
    normalizePlaygroundPersistCompareSnapshot(a, fallbackLocale) ===
    normalizePlaygroundPersistCompareSnapshot(b, fallbackLocale)
  );
}

function playgroundSeedTableHeaderLabelsMatch(
  headerRow: PlaygroundDocNode,
  seedLocale: PlaygroundLocale,
  headerColumns: number,
): boolean {
  const s = STRINGS[seedLocale];
  const headerTexts = (headerRow.content ?? []).map(collectPlaygroundNodeText);
  if (headerTexts.length !== headerColumns) {
    return false;
  }
  return (
    headerTexts[0] === s.tableH1 &&
    headerTexts[1] === s.tableH2 &&
    headerTexts[2] === s.tableH3
  );
}

function playgroundTableRowHasSeedColumnShape(row: PlaygroundDocNode): boolean {
  if (row.type !== "tableRow" || !row.content?.length) {
    return false;
  }
  return !row.content.some(
    (cell) => cell.type !== "tableCell" && cell.type !== "tableHeader",
  );
}

function playgroundTableHasExtraRowsBeyondSeed(
  content: string,
  fallbackLocale: Locale,
): boolean {
  const row = playgroundPersistedContentForRow(content);
  if (!row) return false;
  try {
    const parsed = JSON.parse(row) as PlaygroundDoc;
    const seedLocale = resolvePlaygroundSeedLocale(row, fallbackLocale);
    const canonical = JSON.parse(
      playgroundPersistedContentForRow(
        JSON.stringify(buildPlaygroundContent(seedLocale)),
      ),
    ) as PlaygroundDoc;
    const liveTable = findPlaygroundSeedTable(parsed, seedLocale);
    const canonicalTable = findPlaygroundSeedTable(canonical, seedLocale);
    if (!liveTable?.content?.length || !canonicalTable?.content?.length) {
      return false;
    }
    const canonicalRows = canonicalTable.content;
    const liveRows = liveTable.content;
    if (liveRows.length <= canonicalRows.length) {
      return false;
    }
    const headerColumns = canonicalRows[0]?.content?.length ?? 0;
    if (headerColumns === 0) {
      return false;
    }
    const headerRow = liveRows[0];
    if (
      !headerRow ||
      !playgroundSeedTableHeaderLabelsMatch(
        headerRow,
        seedLocale,
        headerColumns,
      )
    ) {
      return false;
    }
    for (let i = 1; i < canonicalRows.length; i += 1) {
      const seedRow = liveRows[i];
      if (
        !seedRow ||
        !playgroundTableRowHasSeedColumnShape(seedRow) ||
        (seedRow.content?.length ?? 0) !== headerColumns
      ) {
        return false;
      }
    }
    for (let i = canonicalRows.length; i < liveRows.length; i += 1) {
      const extraRow = liveRows[i];
      if (
        !extraRow ||
        !playgroundTableRowHasSeedColumnShape(extraRow) ||
        (extraRow.content?.length ?? 0) !== headerColumns
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/** True when live playground table matches seed plus optional trailing data rows. */
export function playgroundContentMatchesQaTableRowAppend(
  content: string,
  fallbackLocale: Locale,
): boolean {
  const row = playgroundPersistedContentForRow(content);
  if (!row) return false;

  try {
    const parsed = JSON.parse(row) as PlaygroundDoc;
    if (parsed.type !== "doc" || !Array.isArray(parsed.content)) {
      return false;
    }

    const seedLocale = resolvePlaygroundSeedLocale(row, fallbackLocale);
    const canonical = JSON.parse(
      playgroundPersistedContentForRow(
        JSON.stringify(buildPlaygroundContent(seedLocale)),
      ),
    ) as PlaygroundDoc;
    const liveTable = findPlaygroundSeedTable(parsed, seedLocale);
    const canonicalTable = findPlaygroundSeedTable(canonical, seedLocale);
    if (!liveTable?.content?.length || !canonicalTable?.content?.length) {
      return false;
    }

    const canonicalRows = canonicalTable.content;
    const liveRows = liveTable.content;
    if (liveRows.length <= canonicalRows.length) {
      return false;
    }

    const headerColumns = canonicalRows[0]?.content?.length ?? 0;
    if (headerColumns === 0) return false;

    const headerRow = liveRows[0];
    if (
      !headerRow ||
      !playgroundSeedTableHeaderLabelsMatch(
        headerRow,
        seedLocale,
        headerColumns,
      )
    ) {
      return false;
    }

    for (let i = 1; i < canonicalRows.length; i += 1) {
      const seedRow = liveRows[i];
      if (
        !seedRow ||
        !playgroundTableRowHasSeedColumnShape(seedRow) ||
        (seedRow.content?.length ?? 0) !== headerColumns
      ) {
        return false;
      }
    }

    for (let i = canonicalRows.length; i < liveRows.length; i += 1) {
      const extraRow = liveRows[i];
      if (
        !extraRow ||
        !playgroundTableRowHasSeedColumnShape(extraRow) ||
        (extraRow.content?.length ?? 0) !== headerColumns
      ) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

function playgroundTableCellIsTextEmpty(cell: PlaygroundDocNode): boolean {
  return collectPlaygroundNodeText(cell).trim().length === 0;
}

function playgroundTableColumnIsEmptyInAllRows(
  rows: PlaygroundDocNode[],
  colIndex: number,
): boolean {
  return rows.every((row) => {
    const cell = row.content?.[colIndex];
    if (!cell) return false;
    return playgroundTableCellIsTextEmpty(cell);
  });
}

function stripEmptyColumnsFromPlaygroundTable(
  table: PlaygroundDocNode,
): PlaygroundDocNode | null {
  if (table.type !== "table" || !table.content?.length) {
    return null;
  }
  const rows = table.content;
  const colCount = rows[0]?.content?.length ?? 0;
  if (colCount === 0) {
    return null;
  }

  const keepIndices: number[] = [];
  for (let c = 0; c < colCount; c += 1) {
    if (!playgroundTableColumnIsEmptyInAllRows(rows, c)) {
      keepIndices.push(c);
    }
  }

  if (keepIndices.length === colCount) {
    return table;
  }

  return {
    ...table,
    content: rows.map((row) => ({
      ...row,
      content: keepIndices.map((i) => row.content![i]),
    })),
  };
}

/** True when seed table has extra empty columns from insert (round-trip QA, iter 30). */
export function playgroundContentMatchesQaTableColumnRoundTrip(
  content: string,
  fallbackLocale: Locale,
): boolean {
  const row = playgroundPersistedContentForRow(content);
  if (!row) return false;

  try {
    const parsed = JSON.parse(row) as PlaygroundDoc;
    const seedLocale = resolvePlaygroundSeedLocale(row, fallbackLocale);
    const canonical = JSON.parse(
      playgroundPersistedContentForRow(
        JSON.stringify(buildPlaygroundContent(seedLocale)),
      ),
    ) as PlaygroundDoc;
    const liveTable = findPlaygroundSeedTable(parsed, seedLocale);
    const canonicalTable = findPlaygroundSeedTable(canonical, seedLocale);
    if (!liveTable?.content?.length || !canonicalTable?.content?.length) {
      return false;
    }

    const canonicalRows = canonicalTable.content;
    const liveRows = liveTable.content;
    if (liveRows.length !== canonicalRows.length) {
      return false;
    }

    const canonicalColCount = canonicalRows[0]?.content?.length ?? 0;
    const liveColCount = liveRows[0]?.content?.length ?? 0;
    if (liveColCount <= canonicalColCount || canonicalColCount === 0) {
      return false;
    }

    const stripped = stripEmptyColumnsFromPlaygroundTable(liveTable);
    if (!stripped?.content?.length) {
      return false;
    }

    const strippedColCount = stripped.content[0]?.content?.length ?? 0;
    if (strippedColCount !== canonicalColCount) {
      return false;
    }

    const headerRow = stripped.content[0];
    if (
      !headerRow ||
      !playgroundSeedTableHeaderLabelsMatch(
        headerRow,
        seedLocale,
        canonicalColCount,
      )
    ) {
      return false;
    }

    const strippedTableJson = JSON.stringify(
      normalizePlaygroundTableNodeForPersistCompare(stripped),
    );
    const canonicalTableJson = JSON.stringify(
      normalizePlaygroundTableNodeForPersistCompare(canonicalTable),
    );
    return strippedTableJson === canonicalTableJson;
  } catch {
    return false;
  }
}

export type PlaygroundDriftKind =
  | "none"
  | "titleDrift"
  | "structural"
  | "markOnly"
  | "qaTailAppend"
  | "qaAc2Prep"
  | "qaTableAppend"
  | "qaTableColumnRoundTrip";

/** Single drift classifier for restore chip + persist policy (iter 23 SSOT). */
export function classifyPlaygroundDrift(options: {
  displayTitle: string;
  storedTitle: string;
  storedContent: string;
  liveContent: string | null;
  pendingTitleDraft?: string | null;
  fallbackLocale: Locale;
}): PlaygroundDriftKind {
  const {
    displayTitle,
    storedTitle,
    storedContent,
    liveContent,
    pendingTitleDraft = null,
    fallbackLocale,
  } = options;

  const storedRow = readFormatPlaygroundCanonicalRow(
    storedTitle,
    storedContent,
    fallbackLocale,
  );
  if (!storedRow) {
    return "none";
  }

  const { rowContent, seedLocale, canonicalTitle } = storedRow;

  if (
    playgroundTitleDriftedFromCanonical(
      storedTitle,
      pendingTitleDraft,
      canonicalTitle,
    )
  ) {
    return "titleDrift";
  }

  if (
    (pendingTitleDraft != null || liveContent != null) &&
    playgroundLiveTitleDriftedFromCanonical(
      displayTitle,
      storedTitle,
      pendingTitleDraft,
      canonicalTitle,
    )
  ) {
    return "titleDrift";
  }

  const bodyForClassify = liveContent ?? rowContent;
  const rowForClassify = playgroundPersistedContentForRow(bodyForClassify);
  if (!rowForClassify) {
    return "none";
  }

  if (playgroundListsSectionHasMixedMarker(rowForClassify, seedLocale)) {
    return "structural";
  }

  const canonicalRow = playgroundPersistedContentForRow(
    JSON.stringify(buildPlaygroundContent(seedLocale)),
  );

  if (playgroundContentMatchesQaAc2Prep(rowForClassify, seedLocale)) {
    return "qaAc2Prep";
  }

  if (playgroundContentMatchesQaTailAppend(rowForClassify, seedLocale)) {
    return "qaTailAppend";
  }

  if (playgroundContentMatchesQaTableRowAppend(rowForClassify, seedLocale)) {
    return "qaTableAppend";
  }

  if (
    playgroundContentMatchesQaTableColumnRoundTrip(rowForClassify, seedLocale)
  ) {
    return "qaTableColumnRoundTrip";
  }

  if (
    liveContent != null &&
    liveContent !== rowContent &&
    playgroundContentMatchesQaTableRowAppend(rowContent, seedLocale)
  ) {
    return "qaTableAppend";
  }

  if (
    liveContent != null &&
    playgroundPersistCompareContentsEqual(
      liveContent,
      rowContent,
      fallbackLocale,
    ) &&
    playgroundTableHasExtraRowsBeyondSeed(rowContent, seedLocale)
  ) {
    return "qaTableAppend";
  }

  if (
    comparePlaygroundStructuralDrift(rowForClassify, canonicalRow, seedLocale)
  ) {
    return "structural";
  }

  if (
    playgroundEditorMarkOnlyDriftFromStored(
      rowForClassify,
      rowContent,
      seedLocale,
    ) ||
    playgroundEditorMarkOnlyDriftFromStored(
      rowForClassify,
      canonicalRow,
      seedLocale,
    )
  ) {
    return "markOnly";
  }

  if (
    !storedRow.isCanonical &&
    formatPlaygroundNeedsRestore(storedTitle, rowContent, seedLocale)
  ) {
    return "structural";
  }

  if (
    liveContent != null &&
    liveContent !== rowContent &&
    formatPlaygroundNeedsRestore(displayTitle, rowForClassify, seedLocale)
  ) {
    return "structural";
  }

  return "none";
}

/** True when live JSON structurally drifts from reference (marks and text edits allowed). */
export function comparePlaygroundStructuralDrift(
  liveContent: string,
  referenceContent: string,
  fallbackLocale: Locale,
): boolean {
  const liveRow = playgroundPersistedContentForRow(liveContent);
  const referenceRow = playgroundPersistedContentForRow(referenceContent);
  if (!liveRow || !referenceRow) {
    return liveRow !== referenceRow;
  }
  const seedLocale = resolvePlaygroundSeedLocale(referenceRow, fallbackLocale);
  return (
    normalizePlaygroundNodeTreeSnapshot(liveRow, seedLocale) !==
    normalizePlaygroundNodeTreeSnapshot(referenceRow, seedLocale)
  );
}

/** True when live editor JSON matches persisted playground content (round-trip tolerant). */
export function playgroundEditorContentMatchesStored(
  editorContentJson: string,
  storedContent: string,
  fallbackLocale: Locale,
): boolean {
  if (!storedContent) return false;
  if (editorContentJson === storedContent) return true;
  if (
    playgroundPersistCompareContentsEqual(
      editorContentJson,
      storedContent,
      fallbackLocale,
    )
  ) {
    return true;
  }
  return (
    normalizePlaygroundContentSnapshot(editorContentJson, fallbackLocale) ===
    normalizePlaygroundContentSnapshot(storedContent, fallbackLocale)
  );
}

/** True when live JSON differs from stored only by inline marks (TipTap split nodes included). */
export function playgroundEditorMarkOnlyDriftFromStored(
  editorContentJson: string,
  storedContent: string,
  fallbackLocale: Locale,
): boolean {
  const editorRow = playgroundPersistedContentForRow(editorContentJson);
  const storedRow = playgroundPersistedContentForRow(storedContent);
  if (!storedRow || editorRow === storedRow) {
    return false;
  }
  if (
    playgroundEditorContentMatchesStored(editorRow, storedRow, fallbackLocale)
  ) {
    return false;
  }

  const seedLocale = resolvePlaygroundSeedLocale(storedRow, fallbackLocale);
  const editorStructure = normalizePlaygroundStructureSnapshot(
    editorRow,
    seedLocale,
  );
  if (
    editorStructure ===
    normalizePlaygroundStructureSnapshot(storedRow, seedLocale)
  ) {
    return true;
  }

  const canonicalRow = playgroundPersistedContentForRow(
    JSON.stringify(buildPlaygroundContent(seedLocale)),
  );
  return (
    editorStructure ===
    normalizePlaygroundStructureSnapshot(canonicalRow, seedLocale)
  );
}

/** True when live playground JSON differs from stored/canonical seed only by inline marks. */
export function playgroundFormatQaMarkOnlyDrift(
  liveContent: string,
  storedTitle: string,
  storedContent: string,
  fallbackLocale: Locale,
): boolean {
  const rowContent = playgroundPersistedContentForRow(storedContent);
  if (!isFormatPlaygroundNote(storedTitle, rowContent)) {
    return false;
  }
  if (
    playgroundEditorMarkOnlyDriftFromStored(
      liveContent,
      rowContent,
      fallbackLocale,
    )
  ) {
    return true;
  }
  const seedLocale = resolvePlaygroundSeedLocale(rowContent, fallbackLocale);
  const canonical = playgroundPersistedContentForRow(
    JSON.stringify(buildPlaygroundContent(seedLocale)),
  );
  return playgroundEditorMarkOnlyDriftFromStored(
    liveContent,
    canonical,
    seedLocale,
  );
}

/** True when live playground body matches canonical seed node tree (marks/text edits allowed). */
export function playgroundFormatQaStructureMatchesCanonical(
  liveContent: string,
  storedTitle: string,
  storedContent: string,
  fallbackLocale: Locale,
): boolean {
  const rowContent = playgroundPersistedContentForRow(storedContent);
  if (!isFormatPlaygroundNote(storedTitle, rowContent)) {
    return false;
  }
  const seedLocale = resolvePlaygroundSeedLocale(rowContent, fallbackLocale);
  const canonical = playgroundPersistedContentForRow(
    JSON.stringify(buildPlaygroundContent(seedLocale)),
  );
  return !comparePlaygroundStructuralDrift(liveContent, canonical, seedLocale);
}

/** Hide restore chip when format QA edits preserve seed node tree (marks or in-node text). */
export function playgroundFormatQaDraftHidesRestoreChip(
  liveContent: string,
  storedTitle: string,
  storedContent: string,
  fallbackLocale: Locale,
): boolean {
  const storedRow = playgroundPersistedContentForRow(storedContent);
  const bodyForSandbox = liveContent || storedRow;
  const kind = classifyPlaygroundDrift({
    displayTitle: storedTitle,
    storedTitle,
    storedContent,
    liveContent,
    fallbackLocale,
  });
  return (
    kind === "none" ||
    kind === "markOnly" ||
    kind === "qaTailAppend" ||
    kind === "qaAc2Prep" ||
    kind === "qaTableAppend" ||
    kind === "qaTableColumnRoundTrip" ||
    (kind === "structural" &&
      !playgroundListsSectionHasMixedMarker(bodyForSandbox, fallbackLocale) &&
      playgroundDriftConfinedToTrySandbox(bodyForSandbox, fallbackLocale))
  );
}

/** Persisted JSON normalized the same way for list preview and restore chip gating. */
export function playgroundPersistedContentForRow(content: string): string {
  if (!content) return "";
  return sanitizeBlockImageNoteContent(content).content;
}

export type FormatPlaygroundCanonicalRow = {
  rowContent: string;
  seedLocale: PlaygroundLocale;
  canonicalTitle: string;
  isCanonical: boolean;
};

/** Single read path for persisted playground row — preview, restore chip, bootstrap sync. */
export function readFormatPlaygroundCanonicalRow(
  title: string,
  rawContent: string,
  fallbackLocale: Locale,
): FormatPlaygroundCanonicalRow | null {
  const rowContent = playgroundPersistedContentForRow(rawContent);
  if (!isFormatPlaygroundNote(title, rowContent)) {
    return null;
  }
  const seedLocale = resolvePlaygroundSeedLocale(rowContent, fallbackLocale);
  const canonicalTitle = getFormatPlaygroundTitle(seedLocale);
  const isCanonical = formatPlaygroundMatchesCanonicalSeed(
    title,
    rowContent,
    seedLocale,
  );
  return { rowContent, seedLocale, canonicalTitle, isCanonical };
}

/** True when a write would replace canonical stored seed with drift (flush, autosave, backup). */
export function playgroundWriteRegressesCanonicalStored(
  storedTitle: string,
  storedContent: string,
  candidateContent: string,
  fallbackLocale: Locale,
): boolean {
  const stored = readFormatPlaygroundCanonicalRow(
    storedTitle,
    storedContent,
    fallbackLocale,
  );
  if (!stored?.isCanonical) {
    return false;
  }

  const candidateRow = playgroundPersistedContentForRow(candidateContent);
  const candidateSeedLocale = resolvePlaygroundSeedLocale(
    candidateRow,
    fallbackLocale,
  );
  if (candidateSeedLocale !== stored.seedLocale) {
    return false;
  }
  if (
    formatPlaygroundMatchesCanonicalSeed(
      stored.canonicalTitle,
      candidateRow,
      candidateSeedLocale,
    )
  ) {
    return false;
  }

  if (
    !comparePlaygroundStructuralDrift(
      candidateRow,
      stored.rowContent,
      stored.seedLocale,
    )
  ) {
    return false;
  }

  if (
    playgroundContentMatchesQaTableRowAppend(candidateRow, stored.seedLocale)
  ) {
    return false;
  }

  if (
    playgroundContentMatchesQaTableColumnRoundTrip(
      candidateRow,
      stored.seedLocale,
    )
  ) {
    return false;
  }

  if (playgroundDriftConfinedToTrySandbox(candidateRow, fallbackLocale)) {
    return false;
  }

  return true;
}

/** Stable JSON fingerprint for canonical seed comparison (editor round-trip tolerant). */
export function normalizePlaygroundContentSnapshot(
  content: string,
  locale: Locale,
): string {
  const migrated = migratePlaygroundContentIfStale(content, locale) ?? content;
  try {
    const parsed = JSON.parse(migrated) as PlaygroundDoc;
    if (parsed.type !== "doc" || !Array.isArray(parsed.content)) {
      return migrated;
    }
    const seedLocale = resolvePlaygroundSeedLocale(migrated, locale);
    return JSON.stringify(
      normalizePlaygroundDocForFingerprint(parsed, seedLocale),
    );
  } catch {
    return migrated;
  }
}

/** Locale implied by doc attrs / seed headings (falls back to app locale). */
export function resolvePlaygroundSeedLocale(
  content: string,
  fallbackLocale: Locale,
): PlaygroundLocale {
  try {
    const parsed = JSON.parse(content) as PlaygroundDoc;
    const fromAttrs = readPlaygroundContentLocale(parsed);
    if (fromAttrs) return fromAttrs;
    return inferPlaygroundLocaleFromContent(parsed);
  } catch {
    return resolvePlaygroundLocale(fallbackLocale);
  }
}

/** True when title and body match the locale seed (post-migration). */
export function formatPlaygroundMatchesCanonicalSeed(
  title: string,
  content: string,
  fallbackLocale: Locale,
): boolean {
  if (!content || !isFormatPlaygroundNote(title, content)) return false;

  const seedLocale = resolvePlaygroundSeedLocale(content, fallbackLocale);
  if (title !== getFormatPlaygroundTitle(seedLocale)) return false;

  const canonical = JSON.stringify(buildPlaygroundContent(seedLocale));
  const normalizedStored = normalizePlaygroundContentSnapshot(
    content,
    seedLocale,
  );
  const normalizedCanonical = normalizePlaygroundContentSnapshot(
    canonical,
    seedLocale,
  );
  return normalizedStored === normalizedCanonical;
}

/** True when persisted or pending title differs from the locale seed title. */
export function playgroundTitleDriftedFromCanonical(
  storedTitle: string,
  pendingTitleDraft: string | null,
  canonicalTitle: string,
): boolean {
  if (storedTitle.trim() !== canonicalTitle) {
    return true;
  }
  if (
    pendingTitleDraft != null &&
    pendingTitleDraft.trim() !== canonicalTitle
  ) {
    return true;
  }
  return false;
}

/** True when the live title field shows a rename not yet reflected in storedTitle. */
export function playgroundLiveTitleDriftedFromCanonical(
  displayTitle: string,
  storedTitle: string,
  pendingTitleDraft: string | null,
  canonicalTitle: string,
): boolean {
  if (
    playgroundTitleDriftedFromCanonical(
      storedTitle,
      pendingTitleDraft,
      canonicalTitle,
    )
  ) {
    return true;
  }
  if (pendingTitleDraft != null) {
    return false;
  }
  const trimmedDisplay = displayTitle.trim();
  return (
    trimmedDisplay !== storedTitle.trim() &&
    trimmedDisplay !== canonicalTitle &&
    trimmedDisplay !== ""
  );
}

/** Show restore when playground attrs are present but title or body drifted from seed. */
export function formatPlaygroundNeedsRestore(
  title: string,
  content: string | undefined,
  fallbackLocale: Locale,
): boolean {
  const body = content ?? "";
  if (!isFormatPlaygroundNote(title, body)) return false;
  if (formatPlaygroundMatchesCanonicalSeed(title, body, fallbackLocale)) {
    return false;
  }

  const seedLocale = resolvePlaygroundSeedLocale(body, fallbackLocale);
  if (title !== getFormatPlaygroundTitle(seedLocale)) {
    return true;
  }

  if (playgroundListsSectionHasMixedMarker(body, seedLocale)) {
    return true;
  }

  const canonical = JSON.stringify(buildPlaygroundContent(seedLocale));
  if (playgroundContentMatchesQaTableRowAppend(body, seedLocale)) {
    return false;
  }
  if (playgroundContentMatchesQaTableColumnRoundTrip(body, seedLocale)) {
    return false;
  }
  if (!comparePlaygroundStructuralDrift(body, canonical, seedLocale)) {
    return false;
  }
  if (playgroundEditorMarkOnlyDriftFromStored(body, canonical, seedLocale)) {
    return false;
  }

  return true;
}

/** True when the note list should show the locale seed intro (not contentPlain tail). */
export function playgroundRowShowsSeedListPreview(
  title: string,
  rawContent: string,
  fallbackLocale: Locale,
): boolean {
  const storedRow = readFormatPlaygroundCanonicalRow(
    title,
    rawContent,
    fallbackLocale,
  );
  if (!storedRow) {
    return false;
  }
  if (storedRow.isCanonical) {
    return true;
  }
  if (
    formatPlaygroundMatchesCanonicalSeed(
      storedRow.canonicalTitle,
      storedRow.rowContent,
      storedRow.seedLocale,
    )
  ) {
    return true;
  }

  const needsRestore = formatPlaygroundNeedsRestore(
    storedRow.canonicalTitle,
    storedRow.rowContent,
    storedRow.seedLocale,
  );
  if (!needsRestore) {
    return true;
  }

  // Align with restore chip: sandbox/QA drift still shows seed intro in the list.
  return playgroundFormatQaDraftHidesRestoreChip(
    storedRow.rowContent,
    title,
    storedRow.rowContent,
    fallbackLocale,
  );
}

function playgroundLiveContentNeedsRestore(options: {
  displayTitle: string;
  storedContent: string;
  liveContent: string;
  fallbackLocale: Locale;
}): boolean {
  const { displayTitle, storedContent, liveContent, fallbackLocale } = options;
  const storedFingerprint = normalizePlaygroundContentSnapshot(
    storedContent,
    fallbackLocale,
  );
  const liveFingerprint = normalizePlaygroundContentSnapshot(
    liveContent,
    fallbackLocale,
  );
  if (liveFingerprint === storedFingerprint) {
    return false;
  }

  if (
    playgroundEditorMarkOnlyDriftFromStored(
      liveContent,
      storedContent,
      fallbackLocale,
    )
  ) {
    return false;
  }

  if (
    playgroundFormatQaDraftHidesRestoreChip(
      liveContent,
      displayTitle,
      storedContent,
      fallbackLocale,
    )
  ) {
    return false;
  }

  return formatPlaygroundNeedsRestore(
    displayTitle,
    liveContent,
    fallbackLocale,
  );
}

/** @deprecated Use classifyPlaygroundDrift + shouldShowPlaygroundRestoreButton (iter 23 SSOT). */
export function playgroundRestoreChipOverridesSuppress(options: {
  displayTitle: string;
  storedTitle: string;
  storedContent: string;
  pendingDraftContent: string | null;
  pendingTitleDraft?: string | null;
  fallbackLocale: Locale;
}): boolean {
  return shouldShowPlaygroundRestoreButton({
    ...options,
    liveContent: options.pendingDraftContent,
  });
}

/** Header restore chip — classifyPlaygroundDrift SSOT; live draft wins over persisted row. */
export function shouldShowPlaygroundRestoreButton(options: {
  displayTitle: string;
  storedTitle: string;
  storedContent: string;
  pendingDraftContent: string | null;
  pendingTitleDraft?: string | null;
  fallbackLocale: Locale;
  isRestoringPlayground?: boolean;
  /** @internal Alias for classifyPlaygroundDrift */
  liveContent?: string | null;
}): boolean {
  const {
    displayTitle,
    storedTitle,
    storedContent,
    pendingDraftContent,
    pendingTitleDraft = null,
    fallbackLocale,
    isRestoringPlayground = false,
    liveContent = pendingDraftContent,
  } = options;

  const storedRow = readFormatPlaygroundCanonicalRow(
    storedTitle,
    storedContent,
    fallbackLocale,
  );
  if (!storedRow) {
    return false;
  }

  if (isRestoringPlayground && storedRow.isCanonical) {
    return false;
  }

  const kind = classifyPlaygroundDrift({
    displayTitle,
    storedTitle,
    storedContent,
    liveContent,
    pendingTitleDraft,
    fallbackLocale,
  });

  if (kind === "titleDrift") {
    return true;
  }
  if (kind !== "structural") {
    return false;
  }

  const bodyForChip =
    liveContent ?? playgroundPersistedContentForRow(storedContent);
  return !playgroundFormatQaDraftHidesRestoreChip(
    bodyForChip,
    storedTitle,
    storedContent,
    fallbackLocale,
  );
}

const BACKTEST_HEADING_RE = /^BACKTEST\d+$/;

/** True when live JSON contains a QA marker heading such as BACKTEST43. */
export function playgroundDocHasBacktestMarkerHeading(
  contentJson: string,
): boolean {
  try {
    const parsed = JSON.parse(contentJson) as {
      content?: Array<{
        type?: string;
        content?: Array<{ text?: string }>;
      }>;
    };
    return (
      parsed.content?.some(
        (node) =>
          node.type === "heading" &&
          node.content?.some(
            (inline) =>
              typeof inline.text === "string" &&
              BACKTEST_HEADING_RE.test(inline.text.trim()),
          ),
      ) ?? false
    );
  } catch {
    return false;
  }
}

/** Inline drift banner is suppressed for BACKTEST-only QA inserts (restore stays in menu). */
export function shouldShowPlaygroundRestoreInDriftBanner(_options: {
  displayTitle: string;
  storedTitle: string;
  storedContent: string;
  pendingDraftContent: string | null;
  pendingTitleDraft?: string | null;
  fallbackLocale: Locale;
  isRestoringPlayground?: boolean;
  liveContent?: string | null;
}): boolean {
  return false;
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

export function getFormatPlaygroundTitle(locale: Locale): string {
  return STRINGS[resolvePlaygroundLocale(locale)].title;
}

type PlaygroundDocNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PlaygroundDocNode[];
  text?: string;
};

type PlaygroundDoc = {
  type: "doc";
  attrs?: {
    playgroundContentVersion?: number;
    playgroundContentLocale?: PlaygroundLocale;
  };
  content: PlaygroundDocNode[];
};

function readPlaygroundContentLocale(
  parsed: PlaygroundDoc,
): PlaygroundLocale | null {
  const locale = parsed.attrs?.playgroundContentLocale;
  return locale === "zh" || locale === "en" ? locale : null;
}

/** Whether editor JSON matches the active settings locale (ignores version staleness). */
export function playgroundContentMatchesLocale(
  content: string,
  locale: Locale,
): boolean {
  try {
    const parsed = JSON.parse(content) as PlaygroundDoc;
    const docLocale =
      readPlaygroundContentLocale(parsed) ??
      inferPlaygroundLocaleFromContent(parsed);
    return docLocale === resolvePlaygroundLocale(locale);
  } catch {
    return false;
  }
}

function inferPlaygroundLocaleFromContent(
  parsed: PlaygroundDoc,
): PlaygroundLocale {
  const h1 = parsed.content[0];
  if (h1?.type === "heading" && headingText(h1) === STRINGS.zh.title) {
    return "zh";
  }
  return "en";
}

function findPlaygroundSampleImageIndex(nodes: PlaygroundDocNode[]): number {
  return nodes.findIndex(
    (node) =>
      node.type === "image" && isPlaygroundSampleImageSrc(node.attrs?.src),
  );
}

function migratePlaygroundSampleImageNode(
  imageNode: PlaygroundDocNode,
): PlaygroundDocNode | null {
  if (
    imageNode.type !== "image" ||
    !isPlaygroundSampleImageSrc(imageNode.attrs?.src)
  ) {
    return null;
  }
  const height = imageNode.attrs?.height;
  return {
    ...imageNode,
    attrs: {
      ...imageNode.attrs,
      src: PLAYGROUND_SAMPLE_IMAGE_SRC,
      "data-testid": PLAYGROUND_SAMPLE_IMAGE_TESTID,
      ...(height == null ? { height: PLAYGROUND_SAMPLE_IMAGE_HEIGHT } : {}),
    },
  };
}

function readPlaygroundSampleImageHeight(
  nodes: PlaygroundDocNode[],
): number | undefined {
  const imageNode = nodes[findPlaygroundSampleImageIndex(nodes)];
  const height = imageNode?.attrs?.height;
  return typeof height === "number" ? height : undefined;
}

function applyPlaygroundLocaleMigration(
  parsed: PlaygroundDoc,
  locale: Locale,
): PlaygroundDoc {
  const fresh = buildPlaygroundContent(locale) as PlaygroundDoc;
  const preservedHeight = readPlaygroundSampleImageHeight(parsed.content);
  const freshContent = [...fresh.content];

  if (preservedHeight != null) {
    const sampleIndex = findPlaygroundSampleImageIndex(freshContent);
    if (sampleIndex !== -1) {
      const sampleNode = freshContent[sampleIndex];
      freshContent[sampleIndex] = {
        ...sampleNode,
        attrs: {
          ...sampleNode.attrs,
          height: preservedHeight,
        },
      };
    }
  }

  return {
    ...fresh,
    content: freshContent,
  };
}

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

/** Refresh stale seed copy or realign locale when settings language changes. */
export function migratePlaygroundContentIfStale(
  content: string,
  locale: Locale,
): string | null {
  const version = readPlaygroundContentVersion(content);
  if (version === null) {
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

  const targetLocale = resolvePlaygroundLocale(locale);
  const storedLocale =
    readPlaygroundContentLocale(parsed) ??
    inferPlaygroundLocaleFromContent(parsed);
  const needsLocaleMigration = storedLocale !== targetLocale;
  const needsVersionMigration = version < PLAYGROUND_CONTENT_VERSION;

  if (!needsLocaleMigration && !needsVersionMigration) {
    return null;
  }

  if (needsLocaleMigration) {
    return JSON.stringify(applyPlaygroundLocaleMigration(parsed, locale));
  }

  const s = STRINGS[targetLocale];
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
            height: PLAYGROUND_SAMPLE_IMAGE_HEIGHT,
            "data-testid": PLAYGROUND_SAMPLE_IMAGE_TESTID,
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
    if (headingText(node) === s.sectionImages) {
      const imageNode = contentNodes[i + 2];
      const migratedSample = imageNode
        ? migratePlaygroundSampleImageNode(imageNode)
        : null;
      if (migratedSample) {
        contentNodes[i + 2] = migratedSample;
      }
    }
    if (headingText(node) === s.sectionTry) {
      const tryHintNode = contentNodes[i + 1];
      if (
        tryHintNode?.type === "paragraph" ||
        tryHintNode?.type === "bulletList"
      ) {
        contentNodes[i + 1] = tryHintBulletList(s.tryHintBullets);
      }
    }
    if (headingText(node) === s.sectionTags) {
      const tagsNode = contentNodes[i + 1];
      if (tagsNode?.type === "paragraph") {
        contentNodes[i + 1] = paragraph(
          text(s.tagsText),
          text(s.tag),
          text(s.tagsWikiLinkGlue),
          text(s.wikiLink),
          text(s.tagsWikiLinkEnd),
          text(s.tagsExternalPrefix),
          text(`[[${s.tagsExternalLabel}]]`),
          text(s.tagsExternalMid),
          text(`[[${s.tagsExternalLabel}]]`),
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

  for (let i = 0; i < contentNodes.length; i += 1) {
    const migratedSample = migratePlaygroundSampleImageNode(contentNodes[i]);
    if (migratedSample) {
      contentNodes[i] = migratedSample;
    }
  }

  const updated: PlaygroundDoc = {
    ...parsed,
    attrs: {
      ...parsed.attrs,
      playgroundContentVersion: PLAYGROUND_CONTENT_VERSION,
      playgroundContentLocale: targetLocale,
    },
    content: contentNodes,
  };

  return JSON.stringify(updated);
}

type PlaygroundPickCandidate = {
  id: string;
  title: string;
  content: string;
  isPinned?: boolean;
  modifiedAt?: number;
};

function parsePlaygroundContentVersion(content: string): number {
  try {
    const parsed = JSON.parse(content) as PlaygroundDoc;
    return parsed.attrs?.playgroundContentVersion ?? 0;
  } catch {
    return 0;
  }
}

function comparePlaygroundPickCandidates(
  a: PlaygroundPickCandidate,
  b: PlaygroundPickCandidate,
  locale: Locale,
): number {
  const localeTitle = getFormatPlaygroundTitle(locale);
  const score = (note: PlaygroundPickCandidate) =>
    [
      note.title === localeTitle ? 1 : 0,
      FORMAT_PLAYGROUND_TITLES.includes(note.title) ? 1 : 0,
      note.isPinned ? 1 : 0,
      parsePlaygroundContentVersion(note.content),
      note.modifiedAt ?? 0,
    ] as const;

  const sa = score(a);
  const sb = score(b);
  for (let i = 0; i < sa.length; i += 1) {
    if (sa[i] !== sb[i]) return sa[i] - sb[i];
  }
  return a.id.localeCompare(b.id);
}

/** Pick the canonical playground note when duplicates exist (locale title > pinned > version). */
export function pickFormatPlaygroundNote<T extends PlaygroundPickCandidate>(
  candidates: T[],
  locale: Locale,
): T | undefined {
  const matches = candidates.filter((n) =>
    isFormatPlaygroundNote(n.title, n.content),
  );
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];

  return [...matches].sort((a, b) =>
    comparePlaygroundPickCandidates(b, a, locale),
  )[0];
}

/** Plain-text excerpt of the locale seed — used for list preview seed detection. */
export function getFormatPlaygroundSeedPlain(locale: Locale): string {
  return extractPlainTextFromTiptap(buildPlaygroundContent(locale));
}

const PLAYGROUND_INTRO_PREVIEW_LIMIT = 120;

/** Intro paragraph shown in the note list when the playground row matches seed. */
export function getFormatPlaygroundIntroExcerpt(locale: Locale): string {
  const intro = STRINGS[resolvePlaygroundLocale(locale)].intro;
  const normalized = intro.replace(/\s+/g, " ").trim();
  return normalized.length > PLAYGROUND_INTRO_PREVIEW_LIMIT
    ? normalized.slice(0, PLAYGROUND_INTRO_PREVIEW_LIMIT)
    : normalized;
}

/** Hide duplicate canonical-title playground cards; renamed/custom-title copies stay visible. */
export function filterNotesForPlaygroundList<T extends PlaygroundPickCandidate>(
  notes: T[],
  locale: Locale,
): T[] {
  const canonicalCandidates = notes.filter(
    (note) =>
      FORMAT_PLAYGROUND_TITLES.includes(note.title) &&
      isFormatPlaygroundNote(note.title, note.content),
  );
  const canonical = pickFormatPlaygroundNote(canonicalCandidates, locale);
  if (!canonical) return notes;

  return notes.filter((note) => {
    if (!FORMAT_PLAYGROUND_TITLES.includes(note.title)) return true;
    if (!isFormatPlaygroundNote(note.title, note.content)) return true;
    return note.id === canonical.id;
  });
}

async function findFormatPlaygroundNoteForSync(locale: Locale) {
  const { notes } = useNoteStore.getState();

  const inStore = pickFormatPlaygroundNote(notes, locale);
  if (inStore) return inStore;

  const storedNotes = await noteStorage.list();
  return pickFormatPlaygroundNote(storedNotes, locale);
}

async function resolveActiveNoteForLocaleSync(
  activeNoteId: string | null,
  notes: Array<{ id: string; title: string; content: string }>,
) {
  if (activeNoteId == null) return undefined;

  const inStore = notes.find((candidate) => candidate.id === activeNoteId);
  if (inStore) return inStore;

  return (await noteStorage.get(activeNoteId)) ?? undefined;
}

function activeNoteIsPlayground(
  activeNote: { title: string; content: string } | undefined,
  flushedContent?: string | null,
): boolean {
  if (
    activeNote != null &&
    isFormatPlaygroundNote(activeNote.title, activeNote.content)
  ) {
    return true;
  }

  return Boolean(flushedContent && isFormatPlaygroundNote("", flushedContent));
}

export type FormatPlaygroundLocaleSyncResult = {
  canonicalNoteId: string | null;
  switchedFromNoteId: string | null;
  flushDropped: boolean;
};

export type FormatPlaygroundLocaleSyncOptions = {
  /** When true, move editor focus to the locale-canonical playground duplicate. */
  focusCanonical?: boolean;
};

const EMPTY_LOCALE_SYNC_RESULT: FormatPlaygroundLocaleSyncResult = {
  canonicalNoteId: null,
  switchedFromNoteId: null,
  flushDropped: false,
};

/** Flush-aware playground sync when settings locale changes (Settings or URL bootstrap). */
export async function syncFormatPlaygroundOnLocaleChange(
  locale: Locale,
  flushedContent?: string | null,
  options?: FormatPlaygroundLocaleSyncOptions,
): Promise<FormatPlaygroundLocaleSyncResult> {
  const note = await findFormatPlaygroundNoteForSync(locale);
  if (!note) return EMPTY_LOCALE_SYNC_RESULT;

  const { activeNoteId, notes, saveNoteContent, saveNoteTitle, setActiveNote } =
    useNoteStore.getState();

  const activeNote = await resolveActiveNoteForLocaleSync(activeNoteId, notes);
  const activeIsPlayground = activeNoteIsPlayground(activeNote, flushedContent);
  const flushApplied = Boolean(flushedContent && activeNoteId === note.id);
  const flushDropped =
    Boolean(flushedContent) && activeIsPlayground && !flushApplied;

  const sourceContent =
    flushedContent && (flushApplied || flushDropped)
      ? flushedContent
      : note.content;
  const migrated = migratePlaygroundContentIfStale(sourceContent, locale);
  const effectiveContent = migrated ?? sourceContent;
  const seedLocale = resolvePlaygroundSeedLocale(effectiveContent, locale);
  const expectedTitle = getFormatPlaygroundTitle(seedLocale);
  const titleNeedsUpdate =
    FORMAT_PLAYGROUND_TITLES.includes(note.title) &&
    note.title !== expectedTitle;

  const storedRow = readFormatPlaygroundCanonicalRow(
    note.title,
    note.content,
    locale,
  );

  if (migrated) {
    if (
      !playgroundWriteRegressesCanonicalStored(
        note.title,
        note.content,
        migrated,
        locale,
      )
    ) {
      await saveNoteContent(note.id, migrated);
    }
  } else if (flushDropped) {
    if (
      !storedRow?.isCanonical &&
      !playgroundWriteRegressesCanonicalStored(
        note.title,
        note.content,
        sourceContent,
        locale,
      )
    ) {
      await saveNoteContent(note.id, sourceContent);
    }
  }
  if (titleNeedsUpdate) {
    await saveNoteTitle(note.id, expectedTitle);
  }

  let switchedFromNoteId: string | null = null;
  if (
    options?.focusCanonical &&
    activeIsPlayground &&
    activeNoteId != null &&
    activeNoteId !== note.id
  ) {
    setActiveNote(note.id);
    switchedFromNoteId = activeNoteId;
  }

  return {
    canonicalNoteId: note.id,
    switchedFromNoteId,
    flushDropped,
  };
}
