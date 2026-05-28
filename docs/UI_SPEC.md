# Hunos - UI/UX Specification

## Design Principles

1. **Mobile-first**: Phone is the primary design target. Desktop is adaptive enhancement.
2. **Content-forward**: The note content is the star. UI chrome minimizes.
3. **Instant response**: Every tap gives immediate visual feedback.
4. **Refined aesthetics**: Clean typography, generous whitespace, warm neutrals.

## Layout Strategy

### Mobile (< 768px) — Note List Home + Slide-over Tags

The default screen is the **Note List**. Tags are accessed via a burger menu (≡) that opens a slide-over sidebar. The editor and settings push onto a custom Zustand-managed screen stack (not React Navigation).

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  ≡  All Notes    🔍 │    │  ←  Note Title   ⋮  │    │  ←  Settings        │
├─────────────────────┤    ├─────────────────────┤    ├─────────────────────┤
│                     │    │                     │    │                     │
│  📌 Pinned Note     │    │  Note content here  │    │  Theme              │
│  3 min ago          │    │  with **markdown**  │    │  Language           │
│  ─────────────────  │    │  formatting...      │    │  Typography         │
│  Meeting Notes      │    │                     │    │                     │
│  2 min ago          │    │  #work #meeting     │    │                     │
│  Project Plan       │    │                     │    │                     │
│  1 hour ago         │    │                     │    │                     │
│                     │    │                     │    │                     │
│                     │    ├─────────────────────┤    │                     │
│                     │    │ B I S ~ H  ☐ <> "" │    │                     │
├─────────────────────┤    └─────────────────────┘    └─────────────────────┘
│         [+]         │
└─────────────────────┘

Slide-over tags sidebar (tap ≡):
┌─────────────────────┐
│  Tags            ✕  │
├─────────────────────┤
│  All Notes    (42)  │
│  #work        (12)  │
│    #work/proj  (5)  │
│  #personal     (8)  │
│  #ideas       (15)  │
│  ─────────────────  │
│  Untagged      (7)  │
│  Archive       (3)  │
│  Trash         (1)  │
└─────────────────────┘
```

Navigation flow:
- **Note List** (home) → tap note → **Editor** (stack push)
- **Note List** → tap ≡ → **Tags sidebar** (overlay, not a stack screen)
- Select tag in sidebar → sidebar closes, note list filters by tag
- **Editor** → back (←) → **Note List** (stack pop)
- **Settings** accessible from editor or list overflow menu

### Tablet (768px - 1024px) - Split View

Note list is always visible. Tags open as a slide-over sidebar (same burger menu). Editor occupies the remaining space.

```
┌──────────────┬──────────────────────────────────┐
│  Note List   │  Editor                          │
│  (320px)     │                                  │
│  ≡ All Notes │  Note content with full editing  │
│              │  capabilities...                 │
│  ┌────────┐  │                                  │
│  │Note 1  │  │                                  │
│  ├────────┤  │                                  │
│  │Note 2  │  │                                  │
│  └────────┘  │                                  │
└──────────────┴──────────────────────────────────┘
```

### Desktop (> 1024px) - Three Panel

```
┌────────────┬─────────────────┬──────────────────────────────────┐
│  Tags      │  Note List      │  Editor                          │
│  (220px)   │  (300px)        │  (flex)                          │
│            │                 │                                  │
│  All Notes │  📌 Pinned Note │  # Meeting Notes                 │
│  #work     │  3 min ago      │                                  │
│   /proj    │  ─────────────  │  Discussed the roadmap for Q3... │
│  #personal │  Meeting Notes  │                                  │
│  #ideas    │  2 min ago      │  ## Action Items                 │
│            │                 │  - [ ] Review designs            │
│  ────────  │  Project Plan   │  - [x] Send proposal             │
│  Untagged  │  1 hour ago     │                                  │
│  Archive   │                 │  #work #meeting                  │
│  Trash     │                 │  ── Backlinks ──────────         │
│            │                 │  Project Plan: "...meeting..."   │
└────────────┴─────────────────┴──────────────────────────────────┘
```

## Component Inventory

### Navigation Components
- `AppContent` — Switches between mobile stack / tablet split / desktop three-panel based on `useAdaptiveLayout`
- `useUIStore` — Custom screen stack (`noteList` → `editor` → `settings`), sidebar visibility, search, toasts
- `MobileHeader` — Back button + title + action menu
- `FAB` (Floating Action Button) — New note creation

### Tags Components
- `TagsScreen` — Slide-over sidebar (mobile/tablet) or fixed left panel (desktop)
- `TagTreeItem` — Single tag with indent, count badge, expand arrow
- `SpecialSection` — All Notes / Untagged / Archive / Trash

### Note List Components
- `NoteListScreen` — Default mobile home screen; scrollable list with search toggle
- `NoteCard` / `SwipeableNoteCard` — Note preview card (title, snippet, date, pin icon)
- Burger menu button — Opens tags slide-over sidebar via `showSidebar()`

### Editor Components
- `EditorScreen` — Full-screen editor wrapper (mobile) or panel (desktop)
- `TiptapEditor` — TipTap/ProseMirror editor rendered directly in DOM
- `EditorToolbar` — Horizontally scrollable formatting toolbar
- `InfoPanel` / `StatisticsPanel` — Word count, TOC, backlinks tabs
- `BacklinksPanel` — Collapsible backlinks section at editor bottom

### Common Components
- `Button` — Primary, secondary, ghost variants
- `BottomSheet` — iOS-style bottom sheet for actions
- `SearchBar` — Expandable search with instant results
- `Toast` — Non-intrusive feedback messages
- `EmptyState` — Illustrated empty states with CTAs

## Color System

### Light Theme
```
background:       #FFFFFF
surface:          #F8F8F8
surfaceElevated:  #FFFFFF (with shadow)
text:             #1A1A1A
textSecondary:    #6B6B6B
textTertiary:     #9B9B9B
accent:           #E85D4A (warm red)
accentLight:      #FEF0EE
border:           #E8E8E8
borderLight:      #F0F0F0
```

### Dark Theme
```
background:       #1A1A1A
surface:          #252525
surfaceElevated:  #2F2F2F
text:             #F0F0F0
textSecondary:    #A0A0A0
textTertiary:     #6B6B6B
accent:           #F27961
accentLight:      #2D2220
border:           #333333
borderLight:      #2A2A2A
```

## Typography

### Font Families
- **Sans** (default): System font stack (-apple-system, SF Pro, Roboto, etc.)
- **Serif**: Georgia, Cambria, serif
- **Mono**: SF Mono, Menlo, monospace

### Type Scale
```
heading1:   28px / 1.2 / bold
heading2:   22px / 1.3 / semibold
heading3:   18px / 1.4 / semibold
body:       16px / 1.6 / regular
bodySmall:  14px / 1.5 / regular
caption:    12px / 1.4 / regular
```

## Spacing Scale

```
xs:   4px
sm:   8px
md:   12px
lg:   16px
xl:   24px
xxl:  32px
xxxl: 48px
```

## Interaction Patterns

### Gestures (Mobile)
- **Swipe right**: Navigate back (custom stack pop via `goBack()`)
- **Long press on note card**: Show actions sheet
- **Pull down on note list**: Activate search
- **Swipe left on note card**: Quick delete (with undo toast)
- **Tap ≡**: Open tags slide-over sidebar
- **Tap backdrop**: Close tags sidebar

### Transitions
- **Stack push**: Slide in from right (300ms, ease-out)
- **Stack pop**: Slide out to right (250ms, ease-in)
- **Sidebar slide-over**: Slide in from left with backdrop fade (250ms)
- **Bottom sheet**: Slide up with backdrop fade (250ms)
- **Theme switch**: Cross-fade (200ms)

### Keyboard (Desktop)
- `Cmd/Ctrl + N`: New note
- `Cmd/Ctrl + F`: Focus search
- `Cmd/Ctrl + B`: Bold
- `Cmd/Ctrl + I`: Italic
- `Cmd/Ctrl + K`: Insert link
- `Cmd/Ctrl + Shift + X`: Strikethrough
- `Cmd/Ctrl + Enter`: Toggle todo checkbox
- `Cmd/Ctrl + Alt + ↑/↓`: Move line / block up or down
- `Tab` / `Shift + Tab`: Nest / outdent list items
- `Escape`: Dismiss modal / deselect

## Empty States

- **No notes**: Illustration + "Create your first note" CTA
- **No search results**: "No notes found" with suggestion to broaden search
- **Empty tag**: "No notes with this tag yet"
- **Empty trash**: "Trash is empty" with reassurance text

## Accessibility

- All interactive elements have minimum 44x44px tap targets
- Color contrast ratio >= 4.5:1 for text
- Screen reader labels on all icons
- Focus indicators visible on keyboard navigation
- Reduced motion: disable animations when user prefers
