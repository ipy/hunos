import type { Locale } from "@/types/settings";
import { noteStorage } from "./noteStorage";
import { db } from "./database";
import { graphEngine } from "@/graph/graphEngine";
import { linkStorage } from "./linkStorage";
import { extractPlainTextFromTiptap } from "@/graph/linkExtractor";
import {
  createFormatPlaygroundNote,
  getFormatPlaygroundTitle,
  isFormatPlaygroundNote,
} from "./formatPlaygroundNote";

export const WELCOME_NOTE_TITLES = [
  "Welcome to Hunos",
  "欢迎使用 Hunos",
] as const;

export const PROJECT_DOCS_NOTE_TITLES = ["project docs", "项目文档"] as const;

export type ProjectDocsPickCandidate = {
  id: string;
  title: string;
  content: string;
  contentPlain?: string;
  isPinned?: boolean;
  createdAt?: number;
};

export function matchesProjectDocsSeedContent(
  content: string,
  locale: Locale,
): boolean {
  const seed = getProjectDocsSeed(locale);
  if (content === JSON.stringify(seed.content)) return true;
  try {
    return (
      extractPlainTextFromTiptap(JSON.parse(content)) === seed.contentPlain
    );
  } catch {
    return false;
  }
}

export function isProjectDocsNote(
  title: string,
  content?: string,
  contentPlain?: string,
): boolean {
  if (contentPlain) {
    for (const seedLocale of ["en", "zh"] as const) {
      if (contentPlain === getProjectDocsSeed(seedLocale).contentPlain) {
        return true;
      }
    }
  }
  if (content) {
    return (
      matchesProjectDocsSeedContent(content, "en") ||
      matchesProjectDocsSeedContent(content, "zh")
    );
  }
  return PROJECT_DOCS_NOTE_TITLES.includes(
    title as (typeof PROJECT_DOCS_NOTE_TITLES)[number],
  );
}

function compareProjectDocsPickCandidates(
  a: ProjectDocsPickCandidate,
  b: ProjectDocsPickCandidate,
  locale: Locale,
): number {
  const expectedTitle = getProjectDocsSeed(locale).title;
  const score = (note: ProjectDocsPickCandidate) =>
    [
      note.title === expectedTitle ? 1 : 0,
      matchesProjectDocsSeedContent(note.content, locale) ? 1 : 0,
      note.isPinned ? 1 : 0,
      -(note.createdAt ?? 0),
    ] as const;

  const sa = score(a);
  const sb = score(b);
  for (let i = 0; i < sa.length; i += 1) {
    if (sa[i] !== sb[i]) return sa[i]! - sb[i]!;
  }
  return a.id.localeCompare(b.id);
}

/** Pick the canonical project-docs seed when duplicate rows exist. */
export function pickProjectDocsNote<T extends ProjectDocsPickCandidate>(
  candidates: T[],
  locale: Locale,
): T | undefined {
  const matches = candidates.filter((note) =>
    isProjectDocsNote(note.title, note.content, note.contentPlain),
  );
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];
  return [...matches].sort((a, b) =>
    compareProjectDocsPickCandidates(b, a, locale),
  )[0];
}

/** Hide duplicate canonical-title project-docs cards; renamed copies stay visible. */
export function filterNotesForProjectDocsList<
  T extends ProjectDocsPickCandidate,
>(notes: T[], locale: Locale): T[] {
  const canonicalCandidates = notes.filter(
    (note) =>
      PROJECT_DOCS_NOTE_TITLES.includes(
        note.title as (typeof PROJECT_DOCS_NOTE_TITLES)[number],
      ) && isProjectDocsNote(note.title, note.content, note.contentPlain),
  );
  const canonical = pickProjectDocsNote(canonicalCandidates, locale);
  if (!canonical) return notes;

  return notes.filter((note) => {
    if (
      !PROJECT_DOCS_NOTE_TITLES.includes(
        note.title as (typeof PROJECT_DOCS_NOTE_TITLES)[number],
      )
    ) {
      return true;
    }
    if (!isProjectDocsNote(note.title, note.content, note.contentPlain)) {
      return true;
    }
    return note.id === canonical.id;
  });
}

/** Merge duplicate project-docs rows and repoint wiki links to the canonical target. */
export async function consolidateProjectDocsNotes(
  locale: Locale,
): Promise<string | null> {
  const notes = await noteStorage.list({ status: "active" });
  const candidates = notes.filter((note) =>
    isProjectDocsNote(note.title, note.content, note.contentPlain),
  );
  if (candidates.length === 0) return null;

  const canonical = pickProjectDocsNote(candidates, locale);
  if (!canonical) return null;

  const { title, content, contentPlain } = getProjectDocsSeed(locale);
  const contentStr = JSON.stringify(content);
  if (canonical.content !== contentStr || canonical.title !== title) {
    await noteStorage.update(canonical.id, {
      title,
      content: contentStr,
      contentPlain,
    });
    await graphEngine.syncNoteLinks(canonical.id, contentStr);
  }

  for (const duplicate of candidates) {
    if (duplicate.id === canonical.id) continue;
    await linkStorage.repointIncomingTarget(duplicate.id, canonical.id);
    await linkStorage.deleteBySource(duplicate.id);
    await noteStorage.delete(duplicate.id);
  }

  await linkStorage.dedupeIncomingWikiLinks(canonical.id);
  return canonical.id;
}

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
    {
      type: "paragraph",
      content: [{ type: "text", text: "#hunos/format-test/welcome" }],
    },
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
    {
      type: "paragraph",
      content: [{ type: "text", text: "#hunos/格式测试/欢迎" }],
    },
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
  const { title, content, contentPlain } = getWelcomeSeed(locale);
  const contentStr = JSON.stringify(content);
  const existing = await db.notes.where("title").equals(title).first();

  if (existing) {
    if (existing.content !== contentStr) {
      await noteStorage.update(existing.id, {
        content: contentStr,
        contentPlain,
      });
      await graphEngine.syncNoteLinks(existing.id, contentStr);
    }
    return;
  }

  for (const altTitle of WELCOME_NOTE_TITLES) {
    if (altTitle === title) continue;
    const alt = await db.notes.where("title").equals(altTitle).first();
    if (!alt) continue;
    await noteStorage.update(alt.id, {
      title,
      content: contentStr,
      contentPlain,
    });
    await graphEngine.syncNoteLinks(alt.id, contentStr);
    return;
  }

  if (await hasWelcomeNote()) {
    return;
  }

  const note = await noteStorage.create({
    content: contentStr,
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

export function getProjectDocsSeed(locale: Locale): {
  title: string;
  content: { type: "doc"; content: unknown[] };
  contentPlain: string;
} {
  const seedLocale = resolveWelcomeSeedLocale(locale);
  if (seedLocale === "zh") {
    return {
      title: "项目文档",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "格式试炼场中的示例笔记，用于测试双向链接导航。",
              },
            ],
          },
        ],
      },
      contentPlain: "格式试炼场中的示例笔记，用于测试双向链接导航。",
    };
  }
  return {
    title: "project docs",
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Sample note linked from the format playground for wiki-link navigation tests.",
            },
          ],
        },
      ],
    },
    contentPlain:
      "Sample note linked from the format playground for wiki-link navigation tests.",
  };
}

async function ensureProjectDocsNote(locale: Locale): Promise<void> {
  const { title, content, contentPlain } = getProjectDocsSeed(locale);
  const contentStr = JSON.stringify(content);
  const existing = await db.notes.where("title").equals(title).first();

  if (existing) {
    if (existing.content !== contentStr) {
      await noteStorage.update(existing.id, {
        content: contentStr,
        contentPlain,
      });
      await graphEngine.syncNoteLinks(existing.id, contentStr);
    }
    return;
  }

  for (const altTitle of PROJECT_DOCS_NOTE_TITLES) {
    if (altTitle === title) continue;
    const alt = await db.notes.where("title").equals(altTitle).first();
    if (!alt) continue;
    await noteStorage.update(alt.id, {
      title,
      content: contentStr,
      contentPlain,
    });
    await graphEngine.syncNoteLinks(alt.id, contentStr);
    return;
  }

  const note = await noteStorage.create({
    content: contentStr,
    title,
    contentPlain,
  });
  await graphEngine.syncNoteLinks(note.id, note.content);
}

async function runBootstrapSeed(locale: Locale): Promise<void> {
  await ensureWelcomeNote(locale);
  await ensureProjectDocsNote(locale);
  await ensureFormatPlaygroundNote(locale);
  await consolidateProjectDocsNotes(locale);
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
