/**
 * SQLite Storage Adapter for OpenHarmony
 *
 * This adapter implements the same interface as the Dexie.js web adapter
 * but uses HarmonyOS native SQLite (@ohos.data.relationalStore).
 *
 * NOT YET IMPLEMENTED - This is a placeholder for Phase 3 RNOH port.
 * The actual implementation requires:
 * 1. A TurboModule exposing SQLite operations to JS
 * 2. Native ArkTS/C++ code for database access
 * 3. The same query patterns as Dexie adapter
 *
 * Schema (mirrors Dexie):
 *
 * CREATE TABLE notes (
 *   id TEXT PRIMARY KEY,
 *   title TEXT,
 *   content TEXT,
 *   contentPlain TEXT,
 *   isPinned INTEGER DEFAULT 0,
 *   status TEXT DEFAULT 'active',
 *   trashedAt INTEGER,
 *   createdAt INTEGER NOT NULL,
 *   modifiedAt INTEGER NOT NULL,
 *   wordCount INTEGER DEFAULT 0
 * );
 *
 * CREATE TABLE links (
 *   id TEXT PRIMARY KEY,
 *   sourceNoteId TEXT NOT NULL,
 *   targetNoteId TEXT NOT NULL,
 *   type TEXT NOT NULL,
 *   context TEXT DEFAULT '',
 *   position INTEGER DEFAULT 0,
 *   createdAt INTEGER NOT NULL
 * );
 * CREATE INDEX idx_links_source ON links(sourceNoteId, type);
 * CREATE INDEX idx_links_target ON links(targetNoteId, type);
 *
 * CREATE TABLE tags (
 *   id TEXT PRIMARY KEY,
 *   name TEXT UNIQUE NOT NULL,
 *   displayName TEXT NOT NULL,
 *   parentId TEXT,
 *   noteCount INTEGER DEFAULT 0,
 *   createdAt INTEGER NOT NULL
 * );
 *
 * CREATE TABLE note_tags (
 *   noteId TEXT NOT NULL,
 *   tagId TEXT NOT NULL,
 *   position INTEGER DEFAULT 0,
 *   PRIMARY KEY (noteId, tagId)
 * );
 * CREATE INDEX idx_notetags_tag ON note_tags(tagId);
 *
 * CREATE TABLE settings (
 *   key TEXT PRIMARY KEY,
 *   value TEXT
 * );
 */

export const sqliteAdapter = {
  isAvailable: () => {
    // Check if we're running on OpenHarmony
    return typeof globalThis !== "undefined" && "ohosEnvironment" in globalThis;
  },

  supportsWalCheckpoint(): boolean {
    return sqliteAdapter.isAvailable();
  },

  /** Flush WAL to main db file after autosave (native bridge only). */
  checkpointWal: async (): Promise<void> => {
    console.warn("[SQLite] WAL checkpoint not yet implemented - using Dexie.js fallback");
  },

  // Placeholder - actual implementation depends on RNOH TurboModule
  initialize: async () => {
    console.warn("[SQLite] Not yet implemented - using Dexie.js fallback");
  },
};
