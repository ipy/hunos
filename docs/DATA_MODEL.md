# Hunos - Data Model Specification

## Design Philosophy

The data model follows a **graph-first** approach inspired by Logseq's architecture:
- Notes are nodes in a knowledge graph
- Links (wiki-links, tags, embeds) are edges
- Bidirectional queries are first-class operations
- The schema is extensible for future entity recognition without migrations

## Entities

### Note

The primary content unit. Contains a TipTap JSON document.

```typescript
interface Note {
  id: string;           // UUID v7 (time-sortable, globally unique)
  title: string;        // Extracted from first heading or first line
  content: string;      // Serialized TipTap JSON document
  contentPlain: string; // Plain text extraction for full-text search
  isPinned: boolean;    // Pinned notes float to top of any list
  status: NoteStatus;   // 'active' | 'archived' | 'trashed'
  trashedAt: number | null;  // Timestamp when trashed (for auto-purge)
  createdAt: number;    // Unix timestamp (ms)
  modifiedAt: number;   // Unix timestamp (ms)
  wordCount: number;    // Denormalized for display without parsing
}

type NoteStatus = 'active' | 'archived' | 'trashed';
```

### Link (Graph Edge)

Represents a directional relationship between notes. This table IS the knowledge graph.

```typescript
interface Link {
  id: string;           // UUID v7
  sourceNoteId: string; // Note containing the reference
  targetNoteId: string; // Note being referenced
  type: LinkType;       // Extensible type discriminator
  context: string;      // Surrounding text (for backlink previews)
  position: number;     // Character offset in source document
  createdAt: number;    // When the link was first established
}

type LinkType =
  | 'wiki_link'   // [[note title]] references
  | 'tag_ref'     // #tag references (note -> tag-as-note)
  | 'embed'       // Embedded content references
  | 'entity';     // Future: NER-extracted entities
```

### Tag

First-class entity representing an organizational tag. Tags form a tree via parentId.

```typescript
interface Tag {
  id: string;           // UUID v7
  name: string;         // Unique full path, e.g. "work/projects"
  displayName: string;  // Leaf name for display, e.g. "projects"
  parentId: string | null; // Parent tag ID for hierarchy
  noteCount: number;    // Denormalized count of active notes with this tag
  createdAt: number;
}
```

### NoteTag (Junction)

Many-to-many relationship between notes and tags with positional data.

```typescript
interface NoteTag {
  noteId: string;
  tagId: string;
  position: number;     // Position of tag in note content
}
```

### UserSettings

Key-value store for user preferences.

```typescript
interface UserSettings {
  key: string;          // Setting identifier
  value: any;           // JSON-serializable value
}

// Known keys:
// 'theme' -> 'light' | 'dark' | 'system'
// 'locale' -> 'en' | 'es' | 'zh'
// 'editorFont' -> 'sans' | 'serif' | 'mono'
// 'fontSize' -> number (14-24)
// 'sortBy' -> 'modifiedAt' | 'createdAt' | 'title'
// 'sortOrder' -> 'asc' | 'desc'
```

## Storage Schema (Dexie.js)

```typescript
import Dexie from 'dexie';

class HunosDatabase extends Dexie {
  notes!: Dexie.Table<Note, string>;
  links!: Dexie.Table<Link, string>;
  tags!: Dexie.Table<Tag, string>;
  noteTags!: Dexie.Table<NoteTag, [string, string]>;
  settings!: Dexie.Table<UserSettings, string>;

  constructor() {
    super('hunos');
    this.version(1).stores({
      notes: 'id, title, status, isPinned, createdAt, modifiedAt',
      links: 'id, sourceNoteId, targetNoteId, type, createdAt, [sourceNoteId+type], [targetNoteId+type]',
      tags: 'id, &name, parentId, noteCount',
      noteTags: '[noteId+tagId], noteId, tagId',
      settings: 'key'
    });
  }
}
```

## Index Strategy

| Table | Index | Purpose |
|-------|-------|---------|
| notes | id (PK) | Primary lookup |
| notes | status | Filter active/archived/trashed |
| notes | isPinned | Sort pinned to top |
| notes | modifiedAt | Default sort order |
| notes | createdAt | Alternate sort |
| links | sourceNoteId+type | "What does this note link to?" |
| links | targetNoteId+type | "What links to this note?" (backlinks) |
| tags | &name (unique) | Tag lookup by name |
| tags | parentId | Tree traversal |
| noteTags | noteId | "What tags does this note have?" |
| noteTags | tagId | "What notes have this tag?" |

## Graph Operations

### Create/Update Note (Link Extraction)

When a note is saved, the link extraction engine:
1. Parses TipTap JSON content
2. Finds all `#tag` nodes → creates/updates Tag entries + Link entries (type: 'tag_ref')
3. Finds all `[[wiki-link]]` nodes → creates/resolves target notes + Link entries (type: 'wiki_link')
4. Diffs against existing links → removes stale links, adds new ones
5. Updates tag noteCount denormalization

### Backlinks Query

```typescript
async function getBacklinks(noteId: string): Promise<BacklinkResult[]> {
  const links = await db.links
    .where('targetNoteId')
    .equals(noteId)
    .toArray();

  return Promise.all(links.map(async (link) => {
    const sourceNote = await db.notes.get(link.sourceNoteId);
    return {
      note: sourceNote,
      context: link.context,
      type: link.type,
    };
  }));
}
```

### Tag Hierarchy Computation

```typescript
function buildTagTree(tags: Tag[]): TagTreeNode[] {
  const roots = tags.filter(t => t.parentId === null);
  const childMap = new Map<string, Tag[]>();

  tags.forEach(tag => {
    if (tag.parentId) {
      const siblings = childMap.get(tag.parentId) || [];
      siblings.push(tag);
      childMap.set(tag.parentId, siblings);
    }
  });

  function buildNode(tag: Tag): TagTreeNode {
    return {
      ...tag,
      children: (childMap.get(tag.id) || []).map(buildNode),
    };
  }

  return roots.map(buildNode);
}
```

## Future Extensions (No Migration Required)

### Entity Recognition (v2+)

Add an `entities` table:
```typescript
db.version(2).stores({
  entities: 'id, &name, type, *aliases, createdAt'
});
```

Link entities via existing `links` table with `type: 'entity'` and `targetNoteId` pointing to a virtual "entity note" or a new `targetEntityId` field.

### Graph Visualization (v2+)

The existing `links` table provides all edges needed for force-directed graph rendering. No schema changes required.

## Data Lifecycle

- **Auto-save**: Notes save 500ms after last keystroke
- **Trash**: Soft-delete sets `status: 'trashed'`, `trashedAt: Date.now()`
- **Auto-purge**: Background task removes notes where `trashedAt < now - 30 days`
- **Tag cleanup**: Tags with `noteCount === 0` are removed on app startup
