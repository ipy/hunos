# Hunos - Architecture Specification

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Target Platforms                              │
│  ┌──────────┐  ┌──────────────┐  ┌─────────┐  ┌─────────────────┐  │
│  │Mobile Web│  │ Desktop Web  │  │iOS/Andro│  │  OpenHarmony    │  │
│  │ (browser)│  │  (browser)   │  │Capacitor│  │  (ArkWeb shell) │  │
│  └────┬─────┘  └──────┬───────┘  └────┬────┘  └────────┬────────┘  │
└───────┼────────────────┼───────────────┼─────────────────┼──────────┘
        │                │               │                 │
        └────────────────┴───────────────┴─────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Single Web App (Vite) │
                    │   React 18 + react-dom  │
                    └────────────┬────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────────────┐
│                         Application Layer                             │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Navigation (Zustand uiStore — custom screen stack)            │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │  Screens (NoteList | Editor | Settings + Tags slide-over)      │  │
│  ├────────────────────────────────────────────────────────────────┤  │
│  │  Components (Adaptive layout, inline styles + CSS-in-JS)        │  │
│  └────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
┌────────────────────────────────▼─────────────────────────────────────┐
│                           Core Layer                                  │
│  ┌──────────────┐ ┌──────────┐ ┌─────────────┐ ┌──────┐ ┌─────────┐ │
│  │ TipTap Editor│ │  Stores  │ │ graphEngine │ │ i18n │ │  Theme  │ │
│  │ (@tiptap/    │ │ (Zustand)│ │ (links/tags)│ │      │ │ Context │ │
│  │  react)      │ │          │ │             │ │      │ │         │ │
│  └──────────────┘ └────┬─────┘ └──────┬──────┘ └──────┘ └─────────┘ │
└────────────────────────┼──────────────┼───────────────────────────────┘
                         │              │
┌────────────────────────▼──────────────▼───────────────────────────────┐
│                    Storage Layer (Dexie.js / IndexedDB)                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  noteStorage | linkStorage | tagStorage | settingsStorage      │  │
│  │  - notes: CRUD + search                                        │  │
│  │  - links: graph edges (tag_ref, wiki_link)                     │  │
│  │  - tags: hierarchy + note counts                               │  │
│  │  - settings: key-value                                         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│  Same Dexie.js adapter on all platforms (WebView provides IndexedDB)  │
└──────────────────────────────────────────────────────────────────────┘
```

## Technology Choices

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Framework | React | ^18.2 | Standard web React with react-dom |
| Build | Vite | ^5.4 | Fast HMR, tree shaking, IIFE output for HarmonyOS |
| Editor | @tiptap/react + ProseMirror | ^2.8 | Rich text directly in DOM, no WebView bridge needed |
| State | Zustand | ^4.5 | Minimal, composable, TS-first |
| Storage | Dexie.js (IndexedDB) | ^4.0 | Reactive IndexedDB; works in all WebView contexts |
| Navigation | Custom Zustand stack | — | uiStore manages screen stack + slide-over sidebar |
| i18n | i18next + react-i18next | ^23 / ^15 | Industry standard React bindings |
| Styling | Inline styles + CSS-in-JS | — | Theme tokens via React context; no RN StyleSheet |
| Mobile shell | Capacitor | ^6.2 | Wraps web build in WKWebView / Android WebView |
| Harmony shell | ArkWeb (@kit.ArkWeb) | — | Loads single-file HTML from rawfile |
| Language | TypeScript | ^5.5 | Strict mode |
| Linting | ESLint + Prettier | Latest | Code quality |

## Build & Platform Strategy

### Web (Primary — Ship First)
- Vite bundles `web/main.tsx` → `dist/` as a standard SPA
- TipTap editor renders directly in the DOM via `@tiptap/react`
- Dexie.js provides IndexedDB persistence
- Deployed as static site (Vite dev server locally, static deploy for production)

### iOS / Android (Capacitor 6)
- `npm run build` produces static assets in `dist/`
- `npx cap sync` copies `dist/` into native projects (`ios/`, `android/`)
- Capacitor wraps the web app in WKWebView (iOS) or Android WebView
- Capacitor plugins: Keyboard, SplashScreen, StatusBar
- Dexie.js / IndexedDB works natively inside the WebView

### OpenHarmony (ArkWeb Shell)
- `npm run build:harmony` produces an IIFE bundle via `vite.config.harmony.ts` → `dist-harmony/app.js`
- `harmony/build.sh` inlines the IIFE into a single `index.html` in `rawfile/`
- ArkTS `Index.ets` loads the HTML via `$rawfile('index.html')` in an ArkWeb component
- WebView flags: `javaScriptAccess`, `domStorageAccess`, `databaseAccess` (enables IndexedDB)
- No React Native, Metro, Hermes, or RNOH involved

## Module Dependency Graph

```
web/main.tsx
 └── App.tsx
      ├── ThemeProvider (ThemeContext)
      ├── i18n (i18next, initialized in App)
      └── AppContent
           ├── useAdaptiveLayout (mobile | tablet | desktop)
           ├── useUIStore (screen stack, sidebar, search, toasts)
           ├── TagsScreen (slide-over sidebar on mobile/tablet; panel on desktop)
           ├── NoteListScreen (default mobile home screen)
           ├── EditorScreen
           │    ├── useNoteStore
           │    ├── TiptapEditor (@tiptap/react)
           │    │    ├── StarterKit, TaskList, Highlight, Link, …
           │    │    └── MarkdownReveal (inline mark symbols)
           │    ├── EditorToolbar
           │    └── BacklinksPanel → graphEngine
           └── SettingsScreen
                └── useSettingsStore

Stores:
  useNoteStore  → noteStorage  → Dexie (db.notes)
  useTagStore   → tagStorage   → Dexie (db.tags, db.noteTags)
  useSettingsStore → settingsStorage → Dexie (db.settings)
  graphEngine   → linkStorage + tagStorage + noteStorage
                  → linkExtractor (plain-text #tag and [[wiki]] parsing)
```

## Error Handling Strategy

- Storage errors: retry with exponential backoff, show toast on failure
- Editor crashes: auto-save recovery, restore from last good state
- Network errors: N/A for local features, graceful degradation for future cloud
- Unhandled: global error boundary with "restart" option

## Performance Budget

- Initial load (web): < 2s on 3G, < 500ms on WiFi
- Note list scroll: 60fps
- Editor input latency: < 50ms
- Search results: < 100ms for 10,000 notes
- Storage write: < 50ms per note save
