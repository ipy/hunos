# Hunos - Product Requirements Document

## Vision

Hunos is a beautiful, fast, local-first note-taking app with an elegant UX and a graph-aware data layer that supports bidirectional linking, future knowledge graph features, and entity recognition.

## Target Platforms

1. **Mobile Web** (primary) - phones via browser
2. **Desktop Web** - adaptive multi-panel layout
3. **iOS / Android** - Capacitor 6 wrapping the web app in WKWebView / Android WebView
4. **OpenHarmony (HarmonyOS)** - ArkTS shell with ArkWeb loading the bundled web app from rawfile

All native platforms run the same React web codebase inside a WebView. There is no React Native or platform-specific JS runtime.

## User Personas

### Primary: "The Quick Thinker"
- Captures ideas on the go from their phone
- Needs instant access, zero friction to start writing
- Organizes loosely with tags, not rigid folder hierarchies
- Values beautiful typography and distraction-free writing

### Secondary: "The Knowledge Builder"
- Connects ideas between notes via wiki-links
- Wants to see what links to what (backlinks)
- Builds a personal knowledge base over time
- Will benefit from future entity recognition and graph features

## Core User Stories

### Note Management
- As a user, I can create a new note with a single tap (FAB on mobile)
- As a user, my notes auto-save as I type (debounced 500ms)
- As a user, I can pin important notes so they appear at the top
- As a user, I can archive notes to declutter without deleting
- As a user, I can trash notes (recoverable for 30 days, then auto-purged)
- As a user, I can search all my notes by content or title

### Editor
- As a user, I see formatted text as I type (WYSIWYG markdown)
- As a user, typing `#tag` inline creates a tag and links the note
- As a user, typing `[[note title]]` creates a link to another note
- As a user, I have a toolbar with formatting options (mobile-optimized)
- As a user, I can use keyboard shortcuts for formatting (desktop)
- As a user, I can insert code blocks, todos, blockquotes, images

### Organization
- As a user, I can open a tags sidebar (burger menu on mobile) to browse tags with note counts
- As a user, tapping a tag shows only notes with that tag
- As a user, nested tags (e.g. `#work/projects`) form a hierarchy
- As a user, I can see "Untagged" notes as a special filter
- As a user, I see "All Notes", "Archive", and "Trash" sections

### Bidirectional Links
- As a user, I can see all notes that link to the current note (backlinks)
- As a user, backlinks show surrounding context text
- As a user, I can tap a backlink to navigate to that note

### Settings
- As a user, I can switch between light and dark themes
- As a user, I can change the editor font (sans/serif/mono)
- As a user, I can adjust font size
- As a user, I can change the app language (En/Es/Zh)

### Export
- As a user, I can export a note as Markdown, HTML, or plain text
- As a user, I can print/save as PDF via browser

## Feature Priority (MoSCoW)

### Must Have (v1.0)
- WYSIWYG markdown editor with inline formatting reveal
- Inline #tags with tag sidebar navigation
- Note CRUD (create, read, update, soft-delete)
- Full-text search
- Pin/Archive/Trash
- Light/Dark theme
- Mobile-first responsive layout
- i18n (En/Es/Zh)
- Auto-save

### Should Have (v1.0)
- Wiki-links `[[...]]` with autocomplete
- Backlinks panel
- Export (MD/HTML)
- Focus mode
- Keyboard shortcuts (desktop)
- Note word/character count

### Could Have (v1.1+)
- Graph visualization
- Entity recognition (NER)
- Cloud sync
- AI-powered features
- Collaboration
- Custom themes

### Won't Have (this release)
- Offline PWA service worker (future)
- End-to-end encryption (future)
- Native SQLite bridge (future; Dexie/IndexedDB in WebView is sufficient for v1)

## Non-Functional Requirements

- **Performance**: Editor must feel instant. Note list must render < 16ms per frame
- **Storage**: All data local. No network dependency for core features
- **Accessibility**: WCAG 2.1 AA compliance for web
- **Bundle size**: < 500KB initial JS (gzipped) for web
- **Offline**: Works fully offline once loaded (IndexedDB via Dexie.js)

## Metrics (Future)

- Time to first note creation
- Notes created per session
- Tag adoption rate
- Wiki-link usage rate
- Session duration
