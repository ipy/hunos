export type PlaygroundRestoreSession = {
  isActive: () => boolean;
  begin: () => void;
  end: () => void;
};

export function createPlaygroundRestoreSession(): PlaygroundRestoreSession {
  let active = false;
  return {
    isActive: () => active,
    begin: () => {
      active = true;
    },
    end: () => {
      active = false;
    },
  };
}

/** Effect cleanup must not stash live editor JSON while restore is in flight. */
export function shouldStashAutosaveOnEffectCleanup(
  isRestoringPlayground: boolean,
): boolean {
  return !isRestoringPlayground;
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
