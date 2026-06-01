import type { Editor } from "@tiptap/react";
import type { Locale } from "@/types/settings";
import {
  resolvePlaygroundSeedLocale,
  shouldShowPlaygroundRestoreButton,
  shouldShowPlaygroundRestoreInDriftBanner,
} from "@/storage/formatPlaygroundNote";

export type PlaygroundRestoreVisibilityInput = {
  note: { title: string } | undefined;
  noteContentForEditor: string;
  titleValue: string;
  fallbackLocale: Locale;
  editorInstance: Editor | null;
  pendingContentJson: string | null;
  pendingTitleDraft: string | null;
  isRestoringPlayground: boolean;
};

/** Live editor JSON when no pending autosave ref is set (restore session excluded). */
export function resolvePlaygroundPendingDraftContent(options: {
  pendingContentJson: string | null;
  editorInstance: Editor | null;
  isRestoringPlayground: boolean;
}): string | null {
  let pendingDraftContent = options.pendingContentJson;
  if (
    pendingDraftContent == null &&
    options.editorInstance &&
    !options.isRestoringPlayground
  ) {
    try {
      pendingDraftContent = JSON.stringify(options.editorInstance.getJSON());
    } catch {
      pendingDraftContent = null;
    }
  }
  return pendingDraftContent;
}

export function computePlaygroundRestoreMenuVisible(
  input: PlaygroundRestoreVisibilityInput,
): boolean {
  const { note } = input;
  if (!note) return false;

  const pendingDraftContent = resolvePlaygroundPendingDraftContent({
    pendingContentJson: input.pendingContentJson,
    editorInstance: input.editorInstance,
    isRestoringPlayground: input.isRestoringPlayground,
  });
  const displayTitle = input.titleValue.trim() || note.title;
  return shouldShowPlaygroundRestoreButton({
    displayTitle,
    storedTitle: note.title,
    storedContent: input.noteContentForEditor,
    pendingDraftContent,
    pendingTitleDraft: input.pendingTitleDraft,
    fallbackLocale: input.fallbackLocale,
    isRestoringPlayground: input.isRestoringPlayground,
  });
}

export function computeShowRestorePlaygroundDriftBanner(
  input: PlaygroundRestoreVisibilityInput,
): boolean {
  const { note } = input;
  if (!note) return false;

  const pendingDraftContent = resolvePlaygroundPendingDraftContent({
    pendingContentJson: input.pendingContentJson,
    editorInstance: input.editorInstance,
    isRestoringPlayground: input.isRestoringPlayground,
  });
  const displayTitle = input.titleValue.trim() || note.title;
  return shouldShowPlaygroundRestoreInDriftBanner({
    displayTitle,
    storedTitle: note.title,
    storedContent: input.noteContentForEditor,
    pendingDraftContent,
    pendingTitleDraft: input.pendingTitleDraft,
    fallbackLocale: input.fallbackLocale,
    isRestoringPlayground: input.isRestoringPlayground,
  });
}

export function playgroundRestoreVisibilityContext(
  input: PlaygroundRestoreVisibilityInput,
): {
  pendingDraftContent: string | null;
  playgroundLocale: Locale;
} {
  const pendingDraftContent = resolvePlaygroundPendingDraftContent({
    pendingContentJson: input.pendingContentJson,
    editorInstance: input.editorInstance,
    isRestoringPlayground: input.isRestoringPlayground,
  });
  const playgroundLocale = resolvePlaygroundSeedLocale(
    input.noteContentForEditor,
    input.fallbackLocale,
  );
  return { pendingDraftContent, playgroundLocale };
}
