import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TITLE_AUTOSAVE_DEBOUNCE_MS,
  clearPendingTitleTimer,
  markPendingTitle,
  takePendingTitle,
  type PendingTitleRef,
  type PendingTitleTimerRef,
} from "./editorPendingTitleAutosave";

describe("editorPendingTitleAutosave", () => {
  let pendingTitleRef: PendingTitleRef;
  let timerRef: PendingTitleTimerRef;

  beforeEach(() => {
    vi.useFakeTimers();
    pendingTitleRef = { current: null };
    timerRef = { current: undefined };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces save until TITLE_AUTOSAVE_DEBOUNCE_MS", () => {
    const onSave = vi.fn();
    markPendingTitle(pendingTitleRef, timerRef, "New Title", onSave);

    expect(pendingTitleRef.current).toBe("New Title");
    expect(onSave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(TITLE_AUTOSAVE_DEBOUNCE_MS - 1);
    expect(onSave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onSave).toHaveBeenCalledOnce();
    expect(pendingTitleRef.current).toBeNull();
  });

  it("replaces pending title and resets debounce on rapid edits", () => {
    const onSave = vi.fn();
    markPendingTitle(pendingTitleRef, timerRef, "First", onSave);
    vi.advanceTimersByTime(200);
    markPendingTitle(pendingTitleRef, timerRef, "Second", onSave);

    vi.advanceTimersByTime(TITLE_AUTOSAVE_DEBOUNCE_MS);
    expect(onSave).toHaveBeenCalledOnce();
    expect(pendingTitleRef.current).toBeNull();
  });

  it("takePendingTitle cancels timer and returns pending title", () => {
    const onSave = vi.fn();
    markPendingTitle(pendingTitleRef, timerRef, "TitleFlush111", onSave);

    expect(takePendingTitle(pendingTitleRef, timerRef)).toBe("TitleFlush111");
    expect(pendingTitleRef.current).toBeNull();
    expect(timerRef.current).toBeUndefined();

    vi.advanceTimersByTime(TITLE_AUTOSAVE_DEBOUNCE_MS);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("takePendingTitle returns null when nothing is pending", () => {
    expect(takePendingTitle(pendingTitleRef, timerRef)).toBeNull();
  });

  it("clearPendingTitleTimer is idempotent", () => {
    markPendingTitle(pendingTitleRef, timerRef, "Title", vi.fn());
    clearPendingTitleTimer(timerRef);
    clearPendingTitleTimer(timerRef);
    expect(timerRef.current).toBeUndefined();
  });
});
