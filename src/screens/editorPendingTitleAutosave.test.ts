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

  it("debounces save until TITLE_AUTOSAVE_DEBOUNCE_MS", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    markPendingTitle(pendingTitleRef, timerRef, "New Title", onSave, 0);

    expect(pendingTitleRef.current).toBe("New Title");
    expect(onSave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(TITLE_AUTOSAVE_DEBOUNCE_MS - 1);
    expect(onSave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    await Promise.resolve();
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith("New Title", 0);
    expect(pendingTitleRef.current).toBeNull();
  });

  it("retains pending title when debounced save fails", async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    markPendingTitle(pendingTitleRef, timerRef, "Retry Title", onSave, 1);

    vi.advanceTimersByTime(TITLE_AUTOSAVE_DEBOUNCE_MS);
    await Promise.resolve();

    expect(onSave).toHaveBeenCalledOnce();
    expect(pendingTitleRef.current).toBe("Retry Title");
  });

  it("replaces pending title and resets debounce on rapid edits", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    markPendingTitle(pendingTitleRef, timerRef, "First", onSave, 0);
    vi.advanceTimersByTime(200);
    markPendingTitle(pendingTitleRef, timerRef, "Second", onSave, 0);

    vi.advanceTimersByTime(TITLE_AUTOSAVE_DEBOUNCE_MS);
    await Promise.resolve();
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith("Second", 0);
    expect(pendingTitleRef.current).toBeNull();
  });

  it("takePendingTitle cancels timer and returns pending title", () => {
    const onSave = vi.fn();
    markPendingTitle(pendingTitleRef, timerRef, "TitleFlush111", onSave, 0);

    expect(takePendingTitle(pendingTitleRef, timerRef)).toBe("TitleFlush111");
    expect(pendingTitleRef.current).toBeNull();
    expect(timerRef.current).toBeUndefined();

    vi.advanceTimersByTime(TITLE_AUTOSAVE_DEBOUNCE_MS);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("takePendingTitle returns null when nothing is pending", () => {
    expect(takePendingTitle(pendingTitleRef, timerRef)).toBeNull();
  });

  it("skips debounced save when the note is no longer active", async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    markPendingTitle(
      pendingTitleRef,
      timerRef,
      "After switch",
      onSave,
      0,
      () => false,
    );

    vi.advanceTimersByTime(TITLE_AUTOSAVE_DEBOUNCE_MS);
    await Promise.resolve();

    expect(onSave).not.toHaveBeenCalled();
    expect(pendingTitleRef.current).toBe("After switch");
  });

  it("clearPendingTitleTimer is idempotent", () => {
    markPendingTitle(pendingTitleRef, timerRef, "Title", vi.fn(), 0);
    clearPendingTitleTimer(timerRef);
    clearPendingTitleTimer(timerRef);
    expect(timerRef.current).toBeUndefined();
  });
});
