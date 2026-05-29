import { useEffect } from "react";
import { useNoteStore } from "@/store/noteStore";
import { useUIStore } from "@/store/uiStore";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";

function isFormFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA";
}

function isEditorContextActive(): boolean {
  const { currentScreen } = useUIStore.getState();
  const { activeNoteId } = useNoteStore.getState();
  return activeNoteId != null && currentScreen !== "settings";
}

export function useAppKeyboardShortcuts() {
  const layout = useAdaptiveLayout();

  useEffect(() => {
    if (layout !== "desktop") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;

      const key = e.key.toLowerCase();
      const { currentScreen, openNoteSearch, requestFindInNote } =
        useUIStore.getState();
      if (currentScreen === "settings") return;

      if (e.altKey && key === "f") {
        e.preventDefault();
        if (isEditorContextActive()) {
          requestFindInNote({ replace: true });
        }
        return;
      }

      if (e.altKey) return;

      if (key !== "n" && key !== "f") return;

      if (key === "n") {
        if (isFormFieldTarget(e.target)) return;
        e.preventDefault();
        void useNoteStore.getState().createNote();
        return;
      }

      if (key === "f") {
        e.preventDefault();
        if (e.shiftKey) {
          openNoteSearch();
          return;
        }
        if (isEditorContextActive()) {
          requestFindInNote();
        } else {
          openNoteSearch();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [layout]);
}
