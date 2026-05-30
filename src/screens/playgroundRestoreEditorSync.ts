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
