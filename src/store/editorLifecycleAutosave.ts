import { flushEditorAutosave } from "@/store/editorAutosaveRegistry";

let lifecycleBound = false;
let inFlightFlush: Promise<string | null> | null = null;

function scheduleLifecycleFlush(): void {
  if (inFlightFlush) return;
  inFlightFlush = flushEditorAutosave().finally(() => {
    inFlightFlush = null;
  });
}

function onVisibilityChange(): void {
  if (document.visibilityState === "hidden") {
    scheduleLifecycleFlush();
  }
}

function onPageHide(): void {
  scheduleLifecycleFlush();
}

function onBeforeUnload(): void {
  scheduleLifecycleFlush();
}

/** Flush debounced editor content when the page hides or unloads (ArkWeb + web). */
export function bindEditorLifecycleAutosaveFlush(): () => void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return () => {};
  }
  if (lifecycleBound) {
    return unbindEditorLifecycleAutosaveFlush;
  }

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("beforeunload", onBeforeUnload);
  lifecycleBound = true;

  return unbindEditorLifecycleAutosaveFlush;
}

export function unbindEditorLifecycleAutosaveFlush(): void {
  if (
    !lifecycleBound ||
    typeof document === "undefined" ||
    typeof window === "undefined"
  ) {
    return;
  }

  document.removeEventListener("visibilitychange", onVisibilityChange);
  window.removeEventListener("pagehide", onPageHide);
  window.removeEventListener("beforeunload", onBeforeUnload);
  lifecycleBound = false;
}

/** @internal Test-only reset for listener state between cases. */
export function resetEditorLifecycleAutosaveForTests(): void {
  unbindEditorLifecycleAutosaveFlush();
  inFlightFlush = null;
}
