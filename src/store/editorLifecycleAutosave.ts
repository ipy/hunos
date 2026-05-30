import {
  flushForDocumentHide,
  flushForPageUnload,
  resetLifecycleUnloadForTests,
} from "@/store/lifecycleUnload";
import { HUNOS_LIFECYCLE_HIDE_EVENT } from "@/store/harmonyLifecycleBridge";

let lifecycleBound = false;
let harmonyLifecycleBound = false;

function onHarmonyLifecycleHide(): void {
  void flushForDocumentHide();
}

function onVisibilityChange(): void {
  if (document.visibilityState === "hidden") {
    void flushForDocumentHide();
  }
}

function onPageHide(event: PageTransitionEvent): void {
  void flushForPageUnload(event);
}

function onBeforeUnload(): void {
  void flushForPageUnload();
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
  window.removeEventListener(
    HUNOS_LIFECYCLE_HIDE_EVENT,
    onHarmonyLifecycleHide,
  );
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
  resetLifecycleUnloadForTests();
}
