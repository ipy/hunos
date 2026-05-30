import type { Locale } from "@/types/settings";
import { noteStorage } from "./noteStorage";
import { db } from "./database";
import { graphEngine } from "@/graph/graphEngine";
import {
  createFormatPlaygroundNote,
  getFormatPlaygroundTitle,
  isFormatPlaygroundNote,
} from "./formatPlaygroundNote";

export const WELCOME_NOTE_TITLES = [
  "Welcome to Hunos",
  "欢迎使用 Hunos",
] as const;

export type WelcomeSeedLocale = "en" | "zh";

const WELCOME_CONTENT_EN = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Welcome to Hunos" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Hunos is a beautiful, graph-aware note-taking app. Here are some tips to get started:",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Creating Notes" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Tap the " },
        { type: "text", marks: [{ type: "bold" }], text: "+" },
        {
          type: "text",
          text: " button to create a new note. The first line becomes the title.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Formatting" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Type markdown shortcuts — " },
        { type: "text", marks: [{ type: "bold" }], text: "**bold**" },
        { type: "text", text: ", " },
        { type: "text", marks: [{ type: "italic" }], text: "_italic_" },
        {
          type: "text",
          text: ", # headings, - lists, - [ ] tasks, and more — or use the toolbar. Mix every format in this note while testing. When your cursor is on formatted text, markdown symbols appear.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Tags & Organization" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Organize notes with tags like welcome. Use nested tags with slashes: #hunos/getting-started. Tags appear in the sidebar for quick filtering.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Wiki Links" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Link notes together with [[double brackets]]. This creates a knowledge graph you can explore through the Backlinks panel.",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Customization" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Visit Settings > Typography to customize fonts, sizes, and spacing. Choose from multiple bundled font families.",
        },
      ],
    },
    { type: "paragraph", content: [{ type: "text", text: "#hunos/welcome" }] },
  ],
};

const WELCOME_CONTENT_ZH = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "欢迎使用 Hunos" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Hunos 是一款美观的、支持知识图谱的笔记应用。以下是一些入门提示：",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "创建笔记" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "点击 " },
        { type: "text", marks: [{ type: "bold" }], text: "+" },
        { type: "text", text: " 按钮创建新笔记。第一行自动成为标题。" },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "格式化" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "直接输入 Markdown 快捷键——" },
        { type: "text", marks: [{ type: "bold" }], text: "**粗体**" },
        { type: "text", text: "、" },
        { type: "text", marks: [{ type: "italic" }], text: "_斜体_" },
        {
          type: "text",
          text: "、# 标题、- 列表、- [ ] 任务等，或使用工具栏。测试时可在同一篇笔记里混用所有格式。光标位于格式化文本上时会显示 Markdown 符号。",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "标签与组织" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "用标签组织笔记，如「欢迎」。使用斜杠创建嵌套标签：#hunos/入门指南。标签会显示在侧边栏中。",
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "双向链接" }],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "用 [[双括号]] 链接笔记。这会创建一个知识图谱，你可以通过反向链接面板来浏览关联笔记。",
        },
      ],
    },
    { type: "paragraph", content: [{ type: "text", text: "#hunos/欢迎" }] },
  ],
};

export function resolveWelcomeSeedLocale(locale: Locale): WelcomeSeedLocale {
  return locale === "zh" ? "zh" : "en";
}

export function getWelcomeSeed(locale: Locale): {
  seedLocale: WelcomeSeedLocale;
  title: string;
  content: typeof WELCOME_CONTENT_EN;
  contentPlain: string;
} {
  const seedLocale = resolveWelcomeSeedLocale(locale);
  const content = seedLocale === "zh" ? WELCOME_CONTENT_ZH : WELCOME_CONTENT_EN;
  return {
    seedLocale,
    title: seedLocale === "zh" ? "欢迎使用 Hunos" : "Welcome to Hunos",
    content,
    contentPlain:
      seedLocale === "zh"
        ? "欢迎使用 Hunos\nHunos 是一款美观的、支持知识图谱的笔记应用。"
        : "Welcome to Hunos\nHunos is a beautiful, graph-aware note-taking app.",
  };
}

let bootstrapSeedInflight: Promise<void> | null = null;

async function noteExistsWithTitle(title: string): Promise<boolean> {
  const match = await db.notes.where("title").equals(title).first();
  return Boolean(match);
}

async function hasWelcomeNote(): Promise<boolean> {
  for (const title of WELCOME_NOTE_TITLES) {
    if (await noteExistsWithTitle(title)) {
      return true;
    }
  }
  return false;
}

async function hasFormatPlaygroundNote(): Promise<boolean> {
  const notes = await db.notes.toArray();
  return notes.some((note) => isFormatPlaygroundNote(note.title, note.content));
}

async function ensureWelcomeNote(locale: Locale): Promise<void> {
  if (await hasWelcomeNote()) {
    return;
  }

  const { title, content, contentPlain } = getWelcomeSeed(locale);
  const note = await noteStorage.create({
    content: JSON.stringify(content),
    title,
    contentPlain,
  });

  await graphEngine.syncNoteLinks(note.id, note.content);
}

async function ensureFormatPlaygroundNote(locale: Locale): Promise<void> {
  const expectedTitle = getFormatPlaygroundTitle(locale);
  if (await noteExistsWithTitle(expectedTitle)) {
    return;
  }
  if (await hasFormatPlaygroundNote()) {
    return;
  }
  await createFormatPlaygroundNote(locale);
}

async function runBootstrapSeed(locale: Locale): Promise<void> {
  await ensureWelcomeNote(locale);
  await ensureFormatPlaygroundNote(locale);
}

/** Idempotent first-run seed keyed by bootstrap locale (welcome + format playground). */
export async function createWelcomeNotesIfNeeded(
  locale: Locale,
): Promise<void> {
  if (!bootstrapSeedInflight) {
    bootstrapSeedInflight = runBootstrapSeed(locale).finally(() => {
      bootstrapSeedInflight = null;
    });
  }
  return bootstrapSeedInflight;
}
