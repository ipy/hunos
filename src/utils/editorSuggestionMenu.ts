import type { LayoutMode } from "@/hooks/useAdaptiveLayout";
import { useUIStore } from "@/store/uiStore";

let suppressFocusModeExitThisEscape = false;

let cachedSafeAreaInsetTop: number | null = null;

if (typeof window !== "undefined") {
  const resetSafeAreaCache = () => {
    cachedSafeAreaInsetTop = null;
  };
  window.addEventListener("orientationchange", resetSafeAreaCache);
  window.addEventListener("resize", resetSafeAreaCache);
}

/** Minimum top edge for floating suggestion menus (mobile editor chrome + safe area). */
export function getEditorSuggestionTopInset(layout: LayoutMode): number {
  const chrome = layout === "mobile" ? 52 : 8;
  return chrome + readSafeAreaInsetTop();
}

function readSafeAreaInsetTop(): number {
  if (cachedSafeAreaInsetTop !== null) return cachedSafeAreaInsetTop;
  if (typeof document === "undefined") return 0;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;padding-top:env(safe-area-inset-top);visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  cachedSafeAreaInsetTop = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  probe.remove();
  return cachedSafeAreaInsetTop;
}

export function isSuggestionAnchorRectValid(rect: DOMRect): boolean {
  if (
    ![rect.left, rect.top, rect.bottom, rect.right].every((v) =>
      Number.isFinite(v),
    )
  ) {
    return false;
  }
  const height = rect.bottom - rect.top;
  const width = rect.right - rect.left;
  if (rect.left === 0 && rect.top === 0 && height <= 0 && width <= 0) {
    return false;
  }
  if (typeof window === "undefined") return true;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw === 0 || vh === 0) return true;
  return rect.bottom > 0 && rect.top < vh && rect.right > 0 && rect.left < vw;
}

export function computeSuggestionMenuPosition(
  anchor: DOMRect,
  menuRect: DOMRect,
  options: { topInset?: number; margin?: number } = {},
): { top: number; left: number } {
  const margin = options.margin ?? 8;
  const topMin = options.topInset ?? margin;
  let top = anchor.bottom + margin;
  let left = anchor.left;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;

  if (left + menuRect.width > vw - margin) {
    left = Math.max(margin, vw - menuRect.width - margin);
  }
  if (left < margin) left = margin;

  if (top + menuRect.height > vh - margin) {
    const above = anchor.top - menuRect.height - margin;
    top =
      above >= topMin
        ? above
        : Math.max(topMin, vh - menuRect.height - margin);
  }

  top = Math.max(topMin, top);
  return { top, left };
}

/** True for keystrokes that edit document text (not navigation/modifiers). */
export function isUserTextEditKeyDown(event: KeyboardEvent): boolean {
  if (event.isComposing) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (event.key === "Backspace" || event.key === "Delete") return true;
  return event.key.length === 1;
}

export function getSuggestionAnchorRectAtPos(
  view: import("@tiptap/pm/view").EditorView,
  pos: number,
): DOMRect | null {
  try {
    const coords = view.coordsAtPos(pos);
    const rect = new DOMRect(
      coords.left,
      coords.top,
      Math.max(coords.right - coords.left, 0),
      Math.max(coords.bottom - coords.top, 1),
    );
    return isSuggestionAnchorRectValid(rect) ? rect : null;
  } catch {
    return null;
  }
}

/** Call when Escape closes a suggestion menu so focus mode is not exited on the same keypress. */
export function markSuggestionMenuClosedByEscape(): void {
  suppressFocusModeExitThisEscape = true;
  queueMicrotask(() => {
    suppressFocusModeExitThisEscape = false;
  });
}

/** True only for the Escape keypress that just closed a suggestion menu (not while menu is open). */
export function shouldSuppressFocusModeExitAfterMenuClose(): boolean {
  return suppressFocusModeExitThisEscape;
}

/** True when a Hunos tag/wiki autocomplete menu is mounted and visible. */
export function isEditorSuggestionMenuOpen(): boolean {
  const menu = document.querySelector('[data-hunos-editor-suggestion="true"]');
  if (!(menu instanceof HTMLElement) || !menu.isConnected) return false;
  return menu.getBoundingClientRect().height > 0;
}

/** True when the inline link URL editor bubble is open. */
export function isLinkEditorOpen(): boolean {
  return useUIStore.getState().linkEditorOpen;
}

/** True when the window-level Escape handler should not exit focus mode. */
export function shouldSuppressFocusModeEscape(): boolean {
  return (
    isEditorSuggestionMenuOpen() ||
    isLinkEditorOpen() ||
    suppressFocusModeExitThisEscape
  );
}
