import { flushEditorAutosave } from "@/store/editorAutosaveRegistry";
import { HUNOS_LIFECYCLE_HIDE_EVENT } from "@/store/harmonyLifecycleBridge";

let lifecycleBound = false;
let harmonyLifecycleBound = false;
let inFlightFlush: Promise<string | null> | null = null;

function onHarmonyLifecycleHide(): void {
  scheduleLifecycleFlush();
}

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
  window.addEventListener(HUNOS_LIFECYCLE_HIDE_EVENT, onHarmonyLifecycleHide);
  lifecycleBound = true;
  harmonyLifecycleBound = true;

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
  window.removeEventListener(HUNOS_LIFECYCLE_HIDE_EVENT, onHarmonyLifecycleHide);
  lifecycleBound = false;
  harmonyLifecycleBound = false;
}

/** @internal Dev/test hook — true when native background listener is registered. */
export function isHarmonyLifecycleListenerBound(): boolean {
  return harmonyLifecycleBound;
}

/** @internal Test-only reset for listener state between cases. */
export function resetEditorLifecycleAutosaveForTests(): void {
  unbindEditorLifecycleAutosaveFlush();
  inFlightFlush = null;
}
