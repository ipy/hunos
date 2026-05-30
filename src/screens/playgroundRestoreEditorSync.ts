import type { Editor } from "@tiptap/react";
import { resetEditorHistory } from "@/components/editor/resetEditorHistory";
import {
  playgroundEditorContentMatchesStored,
  resolvePlaygroundSeedLocale,
} from "@/storage/formatPlaygroundNote";
import type { Locale } from "@/types/settings";

export type PlaygroundRestoreSession = {
  isActive: () => boolean;
  begin: (noteId: string) => void;
  end: () => void;
  getNoteId: () => string | null;
  cancelIfNoteChanged: (activeNoteId: string | null | undefined) => boolean;
  queueContent: (content: string) => void;
  hasQueuedContent: () => boolean;
  takeQueuedContent: () => string | null;
};

export function createPlaygroundRestoreSession(): PlaygroundRestoreSession {
  let active = false;
  let noteId: string | null = null;
  let queuedContent: string | null = null;
  return {
    isActive: () => active,
    begin: (id: string) => {
      active = true;
      noteId = id;
      queuedContent = null;
    },
    end: () => {
      active = false;
      noteId = null;
      queuedContent = null;
    },
    getNoteId: () => noteId,
    cancelIfNoteChanged: (activeNoteId) => {
      if (!active || !noteId || !activeNoteId || noteId === activeNoteId) {
        return false;
      }
      active = false;
      noteId = null;
      queuedContent = null;
      return true;
    },
    queueContent: (content: string) => {
      queuedContent = content;
    },
    hasQueuedContent: () => queuedContent !== null,
    takeQueuedContent: () => {
      const content = queuedContent;
      queuedContent = null;
      return content;
    },
  };
}

/** Effect cleanup must not stash live editor JSON while restore is in flight. */
export function shouldStashAutosaveOnEffectCleanup(
  isRestoringPlayground: boolean,
): boolean {
  return !isRestoringPlayground;
}

function tryParseStoredContent(str: string): object | undefined {
  if (!str) return undefined;
  try {
    const parsed = JSON.parse(str);
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Force restored playground JSON into the live editor (emitUpdate false).
 * Ends the restore session deterministically — does not rely on onUpdate echo.
 */
export function applyPlaygroundRestoreContentToEditor(
  editor: Editor,
  storedContent: string,
): boolean {
  if (!storedContent) {
    editor.chain().setMeta("addToHistory", false).clearContent(true).run();
    resetEditorHistory(editor);
    return true;
  }

  const parsed = tryParseStoredContent(storedContent);
  if (!parsed) return false;

  editor.chain().setMeta("addToHistory", false).setContent(parsed, false).run();
  resetEditorHistory(editor);
  return true;
}

export function handlePlaygroundRestoreApplyResult(options: {
  applied: boolean;
  content: string;
  session: PlaygroundRestoreSession;
}): boolean {
  if (options.applied) {
    return true;
  }
  options.session.queueContent(options.content);
  return false;
}

export function finalizePlaygroundRestoreInEditor(options: {
  session: PlaygroundRestoreSession;
  editor: Editor | null;
  restoredContent: string;
}): boolean {
  if (!options.session.isActive()) return true;

  if (!options.restoredContent) {
    options.session.end();
    return true;
  }

  if (!options.editor) {
    options.session.queueContent(options.restoredContent);
    return false;
  }

  const applied = applyPlaygroundRestoreContentToEditor(
    options.editor,
    options.restoredContent,
  );
  if (applied) {
    options.session.end();
  }
  return applied;
}

/** Apply content queued while the editor was still mounting. */
export function applyQueuedPlaygroundRestoreWhenEditorReady(options: {
  session: PlaygroundRestoreSession;
  editor: Editor | null;
  activeNoteId?: string | null;
}): boolean {
  if (!options.editor || !options.session.isActive()) return false;
  if (options.session.cancelIfNoteChanged(options.activeNoteId)) return false;
  if (!options.session.hasQueuedContent()) return false;

  const content = options.session.takeQueuedContent();
  if (!content) return false;

  const applied = applyPlaygroundRestoreContentToEditor(
    options.editor,
    content,
  );
  if (applied) {
    options.session.end();
  }
  return handlePlaygroundRestoreApplyResult({
    applied,
    content,
    session: options.session,
  });
}

export function shouldEndPlaygroundRestoreSession(options: {
  isRestoringPlayground: boolean;
  hasNoteContent: boolean;
  editorContentJson: string | null;
  restoredContent: string;
  fallbackLocale: Locale;
}): boolean {
  if (!options.isRestoringPlayground) return false;
  if (!options.hasNoteContent) return true;
  if (!options.editorContentJson) return false;
  const seedLocale = resolvePlaygroundSeedLocale(
    options.restoredContent,
    options.fallbackLocale,
  );
  return playgroundEditorContentMatchesStored(
    options.editorContentJson,
    options.restoredContent,
    seedLocale,
  );
}
