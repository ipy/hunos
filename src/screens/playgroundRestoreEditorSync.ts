import type { Editor } from "@tiptap/react";
import { resetEditorHistory } from "@/components/editor/resetEditorHistory";

export type PlaygroundRestoreSession = {
  isActive: () => boolean;
  begin: () => void;
  end: () => void;
  queueContent: (content: string) => void;
  hasQueuedContent: () => boolean;
  takeQueuedContent: () => string | null;
};

export function createPlaygroundRestoreSession(): PlaygroundRestoreSession {
  let active = false;
  let queuedContent: string | null = null;
  return {
    isActive: () => active,
    begin: () => {
      active = true;
      queuedContent = null;
    },
    end: () => {
      active = false;
      queuedContent = null;
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

export function finalizePlaygroundRestoreInEditor(options: {
  session: PlaygroundRestoreSession;
  editor: Editor | null;
  restoredContent: string;
}): void {
  if (!options.session.isActive()) return;

  if (!options.restoredContent) {
    options.session.end();
    return;
  }

  if (!options.editor) {
    options.session.queueContent(options.restoredContent);
    return;
  }

  const applied = applyPlaygroundRestoreContentToEditor(
    options.editor,
    options.restoredContent,
  );
  if (applied) {
    options.session.end();
  }
}

/** Apply content queued while the editor was still mounting. */
export function applyQueuedPlaygroundRestoreWhenEditorReady(options: {
  session: PlaygroundRestoreSession;
  editor: Editor | null;
}): boolean {
  if (!options.editor || !options.session.isActive()) return false;
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
  return applied;
}

export function shouldEndPlaygroundRestoreSession(options: {
  isRestoringPlayground: boolean;
  hasNoteContent: boolean;
  editorContentJson: string | null;
  restoredContent: string;
  editorContentMatchesStoredJson: (
    editorContentJson: string,
    storedContent: string,
  ) => boolean;
}): boolean {
  if (!options.isRestoringPlayground) return false;
  if (!options.hasNoteContent) return true;
  if (!options.editorContentJson) return false;
  return options.editorContentMatchesStoredJson(
    options.editorContentJson,
    options.restoredContent,
  );
}
