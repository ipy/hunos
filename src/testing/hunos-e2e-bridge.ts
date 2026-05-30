import { useNoteStore } from "@/store/noteStore";
import { useUIStore } from "@/store/uiStore";

/** Playwright Harmony/WebView E2E — set when building with HUNOS_E2E=1. */
export function mountHunosE2eBridge(): void {
  if (typeof window === "undefined") return;
  const w = window as Window & {
    __hunosE2e?: {
      createNote: () => Promise<unknown>;
      requestFindInNote: (replace?: boolean) => void;
    };
  };
  w.__hunosE2e = {
    createNote: () => useNoteStore.getState().createNote(),
    requestFindInNote: (replace?: boolean) =>
      useUIStore.getState().requestFindInNote(
        replace ? { replace: true } : undefined,
      ),
  };
}
