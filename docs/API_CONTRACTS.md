# Hunos - API Contracts

## Storage Layer

All platforms use **Dexie.js (IndexedDB)** inside a WebView or browser. Storage is accessed through typed modules (`noteStorage`, `linkStorage`, `tagStorage`, `settingsStorage`) backed by a shared `HunosDatabase` Dexie instance. A unified adapter interface describes the contract:

```typescript
interface IStorageAdapter {
  // Lifecycle
  initialize(): Promise<void>;
  close(): Promise<void>;

  // Notes
  createNote(note: Note): Promise<Note>;
  getNote(id: string): Promise<Note | undefined>;
  updateNote(id: string, updates: Partial<Note>): Promise<Note>;
  deleteNote(id: string): Promise<void>; // Hard delete (only from trash)
  listNotes(filter: NoteFilter): Promise<Note[]>;
  searchNotes(query: string): Promise<Note[]>;
  countNotes(filter: NoteFilter): Promise<number>;

  // Links (Graph Edges)
  createLink(link: Link): Promise<Link>;
  deleteLink(id: string): Promise<void>;
  deleteLinksBySource(sourceNoteId: string): Promise<void>;
  getOutgoingLinks(noteId: string): Promise<Link[]>;
  getIncomingLinks(noteId: string): Promise<Link[]>; // Backlinks
  getLinksByType(noteId: string, type: LinkType): Promise<Link[]>;

  // Tags
  createTag(tag: Tag): Promise<Tag>;
  getTag(id: string): Promise<Tag | undefined>;
  getTagByName(name: string): Promise<Tag | undefined>;
  updateTag(id: string, updates: Partial<Tag>): Promise<Tag>;
  deleteTag(id: string): Promise<void>;
  listTags(): Promise<Tag[]>;

  // Note-Tag Relations
  addNoteTag(noteTag: NoteTag): Promise<void>;
  removeNoteTag(noteId: string, tagId: string): Promise<void>;
  removeAllNoteTagsForNote(noteId: string): Promise<void>;
  getTagsForNote(noteId: string): Promise<Tag[]>;
  getNotesForTag(tagId: string): Promise<Note[]>;

  // Settings
  getSetting<T>(key: string): Promise<T | undefined>;
  setSetting<T>(key: string, value: T): Promise<void>;

  // Maintenance
  purgeTrash(olderThanMs: number): Promise<number>; // Returns count purged
  cleanOrphanedTags(): Promise<number>; // Returns count removed
}

interface NoteFilter {
  status?: NoteStatus;
  isPinned?: boolean;
  tagId?: string;
  sortBy?: 'modifiedAt' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
```

**Platform note:** iOS (Capacitor/WKWebView), Android (Capacitor/WebView), and OpenHarmony (ArkWeb) all expose IndexedDB to the embedded web app. No platform-specific SQLite adapter is required for v1. A native SQLite adapter (`src/storage/sqlite.ts`) exists as a future placeholder only.

## Zustand Store Interfaces

### noteStore

```typescript
interface NoteStore {
  // State
  notes: Note[];
  activeNoteId: string | null;
  isLoading: boolean;

  // Actions
  loadNotes(filter?: NoteFilter): Promise<void>;
  loadNotesByTag(tagId: string, filter?: NoteFilter): Promise<void>;
  createNote(): Promise<Note>;
  saveNoteContent(id: string, content: string): Promise<void>;
  saveNoteTitle(id: string, title: string): Promise<void>;
  pinNote(id: string, pinned: boolean): Promise<void>;
  archiveNote(id: string): Promise<void>;
  trashNote(id: string): Promise<void>;
  restoreNote(id: string): Promise<void>;
  permanentlyDelete(id: string): Promise<void>;
  setActiveNote(id: string | null): void;
}
```

On save, `saveNoteContent` delegates to `graphEngine.syncNoteLinks()` to extract tags and wiki-links from content.

### graphEngine

Graph operations are handled by a plain module (not a Zustand store):

```typescript
interface GraphEngine {
  syncNoteLinks(noteId: string, content: string): Promise<void>;
  getBacklinks(noteId: string): Promise<BacklinkResult[]>;
}

interface BacklinkResult {
  noteId: string;
  noteTitle: string;
  context: string;
  type: LinkType;
}
```

`syncNoteLinks` parses TipTap JSON → plain text, runs `extractFromPlainText`, and reconciles tag/wiki-link graph edges in Dexie.

### tagStore

```typescript
interface TagStore {
  // State
  tags: Tag[];
  tagTree: TagTreeNode[];
  activeTagId: string | null;

  // Actions
  loadTags(): Promise<void>;
  setActiveTag(id: string | null): void;
  getOrCreateTag(name: string): Promise<Tag>;
  deleteTag(id: string): Promise<void>;
}

interface TagTreeNode extends Tag {
  children: TagTreeNode[];
  isExpanded: boolean;
}
```

### uiStore

```typescript
interface UIStore {
  // State
  currentScreen: 'noteList' | 'editor' | 'settings';
  screenStack: Screen[];
  sidebarVisible: boolean;
  searchQuery: string;
  searchResults: Note[];
  isSearching: boolean;
  toasts: Toast[];

  // Actions
  navigate(screen: Screen): void;
  goBack(): void;
  toggleSidebar(): void;
  showSidebar(): void;
  hideSidebar(): void;
  setSearchQuery(query: string): void;
  performSearch(query: string): Promise<void>;
  showToast(message: string, type?: 'info' | 'success' | 'error'): void;
  dismissToast(id: string): void;
}
```

Default screen is `noteList`. Navigation is a custom stack managed in Zustand — not React Navigation.

### settingsStore

```typescript
interface SettingsStore {
  // State
  theme: 'light' | 'dark' | 'system';
  locale: 'en' | 'es' | 'zh';
  editorFont: 'sans' | 'serif' | 'mono';
  fontSize: number;
  sortBy: 'modifiedAt' | 'createdAt' | 'title';
  sortOrder: 'asc' | 'desc';

  // Actions
  loadSettings(): Promise<void>;
  updateSetting<K extends keyof SettingsState>(key: K, value: SettingsState[K]): Promise<void>;
}
```

## TipTap Editor API

The editor is `@tiptap/react` rendering ProseMirror directly in the DOM. There is no WebView bridge or TenTap layer.

### Installed Extensions

| Extension | Package | Purpose |
|-----------|---------|---------|
| StarterKit | `@tiptap/starter-kit` | Headings, bold, italic, strike, code, blockquote, lists |
| Placeholder | `@tiptap/extension-placeholder` | Empty-state hint text |
| TaskList / TaskItem | `@tiptap/extension-task-list` | Checkbox todos |
| Highlight | `@tiptap/extension-highlight` | Text highlighting |
| Underline | `@tiptap/extension-underline` | Underline formatting |
| Link | `@tiptap/extension-link` | Hyperlinks |
| MarkdownReveal | `src/components/editor/MarkdownReveal.ts` | Shows markdown symbols (`**`, `_`, etc.) at cursor |

### Tag & Wiki-Link Extraction

Tags and wiki-links are **not** TipTap mark/node extensions. They are plain-text patterns extracted on save:

- **Tags**: `#tagname` or `#parent/child` — matched by regex in `linkExtractor.ts`
- **Wiki-links**: `[[note title]]` — matched by regex in `linkExtractor.ts`

On save, `graphEngine.syncNoteLinks`:
1. Parses TipTap JSON content via `extractPlainTextFromTiptap`
2. Runs `extractFromPlainText` to find `#tags` and `[[wiki-links]]`
3. Creates/updates `Tag`, `NoteTag`, and `Link` records in Dexie
4. Updates note title (first line), plain text, and word count

### Link Extractor API

```typescript
interface ExtractedTag {
  name: string;
  position: number;
}

interface ExtractedWikiLink {
  title: string;
  position: number;
  context: string;
}

interface ExtractionResult {
  tags: ExtractedTag[];
  wikiLinks: ExtractedWikiLink[];
  plainText: string;
  wordCount: number;
  title: string;
}

function extractFromPlainText(text: string): ExtractionResult;
function extractPlainTextFromTiptap(json: unknown): string;
```

### Editor Instance API (via @tiptap/react)

```typescript
// TiptapEditor exposes the Editor instance via onEditorReady callback
interface TiptapEditorProps {
  noteId: string;
  initialContent: string;       // TipTap JSON string
  onChange: (json: string) => void;
  onEditorReady: (editor: Editor) => void;
  fontFamily: EditorFont;
  headingsFont: EditorFont;
  codeFont: EditorFont;
  fontSize: number;
  lineHeight: number;
  lineWidth: number;
  paragraphSpacing: number;
}

// Toolbar commands use standard TipTap chain API:
editor.chain().focus().toggleBold().run();
editor.chain().focus().toggleItalic().run();
editor.chain().focus().toggleHeading({ level: 1 }).run();
// etc.
```

## i18n Key Conventions

```
namespace.component.element.state

Examples:
- common.actions.save
- common.actions.cancel
- common.actions.delete
- tags.screen.title ("Tags")
- tags.sections.allNotes ("All Notes")
- tags.sections.untagged ("Untagged")
- tags.sections.archive ("Archive")
- tags.sections.trash ("Trash")
- notes.list.empty ("No notes yet")
- notes.card.pinned ("Pinned")
- editor.toolbar.bold ("Bold")
- editor.placeholder ("Start writing...")
- settings.theme.title ("Theme")
- settings.theme.light ("Light")
- settings.theme.dark ("Dark")
- settings.language.title ("Language")
```
