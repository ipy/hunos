import { noteStorage } from './noteStorage';
import { db } from './database';

const WELCOME_CONTENT_EN = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Welcome to Hunos' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Hunos is a beautiful, graph-aware note-taking app. Here are some tips to get started:' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Creating Notes' }] },
    { type: 'paragraph', content: [
      { type: 'text', text: 'Tap the ' },
      { type: 'text', marks: [{ type: 'bold' }], text: '+' },
      { type: 'text', text: ' button to create a new note. The first line becomes the title.' },
    ]},
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Formatting' }] },
    { type: 'paragraph', content: [
      { type: 'text', text: 'Use the toolbar below to add ' },
      { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
      { type: 'text', text: ', ' },
      { type: 'text', marks: [{ type: 'italic' }], text: 'italic' },
      { type: 'text', text: ', headings, lists, and more. When your cursor is on formatted text, you\'ll see the markdown symbols appear.' },
    ]},
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Tags & Organization' }] },
    { type: 'paragraph', content: [
      { type: 'text', text: 'Organize notes with tags like #welcome. Use nested tags with slashes: #hunos/getting-started. Tags appear in the sidebar for quick filtering.' },
    ]},
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Wiki Links' }] },
    { type: 'paragraph', content: [
      { type: 'text', text: 'Link notes together with [[double brackets]]. This creates a knowledge graph you can explore through the Backlinks panel.' },
    ]},
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Customization' }] },
    { type: 'paragraph', content: [
      { type: 'text', text: 'Visit Settings > Typography to customize fonts, sizes, and spacing. Choose from multiple font families including Google Fonts.' },
    ]},
    { type: 'paragraph', content: [
      { type: 'text', text: '#hunos/welcome' },
    ]},
  ],
};

const WELCOME_CONTENT_ZH = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '欢迎使用 Hunos' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Hunos 是一款美观的、支持知识图谱的笔记应用。以下是一些入门提示：' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '创建笔记' }] },
    { type: 'paragraph', content: [
      { type: 'text', text: '点击 ' },
      { type: 'text', marks: [{ type: 'bold' }], text: '+' },
      { type: 'text', text: ' 按钮创建新笔记。第一行自动成为标题。' },
    ]},
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '格式化' }] },
    { type: 'paragraph', content: [
      { type: 'text', text: '使用底部工具栏添加' },
      { type: 'text', marks: [{ type: 'bold' }], text: '粗体' },
      { type: 'text', text: '、' },
      { type: 'text', marks: [{ type: 'italic' }], text: '斜体' },
      { type: 'text', text: '、标题、列表等格式。当光标位于格式化文本上时，你会看到对应的 Markdown 符号。' },
    ]},
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '标签与组织' }] },
    { type: 'paragraph', content: [
      { type: 'text', text: '用标签组织笔记，如 #欢迎。使用斜杠创建嵌套标签：#hunos/入门指南。标签会显示在侧边栏中。' },
    ]},
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '双向链接' }] },
    { type: 'paragraph', content: [
      { type: 'text', text: '用 [[双括号]] 链接笔记。这会创建一个知识图谱，你可以通过反向链接面板来浏览关联笔记。' },
    ]},
    { type: 'paragraph', content: [
      { type: 'text', text: '#hunos/欢迎' },
    ]},
  ],
};

export async function createWelcomeNotesIfNeeded(): Promise<void> {
  const existingNotes = await db.notes.count();
  if (existingNotes > 0) return;

  const locale = navigator.language.startsWith('zh') ? 'zh' : 'en';
  const content = locale === 'zh' ? WELCOME_CONTENT_ZH : WELCOME_CONTENT_EN;

  await noteStorage.create({
    content: JSON.stringify(content),
    title: locale === 'zh' ? '欢迎使用 Hunos' : 'Welcome to Hunos',
    contentPlain: locale === 'zh'
      ? '欢迎使用 Hunos\nHunos 是一款美观的、支持知识图谱的笔记应用。'
      : 'Welcome to Hunos\nHunos is a beautiful, graph-aware note-taking app.',
  });
}
