import { describe, expect, it, vi } from "vitest";
import {
  editorContentMatchesStoredJson,
  syncNoteContentInEditor,
} from "./noteSwitchContentUtils";

const sampleDoc = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "UndoScopeAlpha" }],
    },
  ],
});

const otherDoc = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "LocaleUndoMarker" }],
    },
  ],
});

describe("editorContentMatchesStoredJson", () => {
  it("returns true when editor JSON matches stored content", () => {
    expect(editorContentMatchesStoredJson(sampleDoc, sampleDoc)).toBe(true);
  });

  it("returns false when content differs", () => {
    expect(editorContentMatchesStoredJson(sampleDoc, otherDoc)).toBe(false);
  });
});

describe("syncNoteContentInEditor", () => {
  function runSync(
    overrides: Partial<Parameters<typeof syncNoteContentInEditor>[0]>,
  ) {
    const setContent = vi.fn();
    const clearContent = vi.fn();
    const resetHistory = vi.fn();
    const focusStart = vi.fn();

    const outcome = syncNoteContentInEditor({
      initialContent: sampleDoc,
      noteChanged: false,
      contentChangedExternally: false,
      editorContentJson: otherDoc,
      setContent,
      clearContent,
      resetHistory,
      focusStart,
      ...overrides,
    });

    return { outcome, setContent, clearContent, resetHistory, focusStart };
  }

  it("no-ops when note and content are unchanged", () => {
    const { outcome, setContent, resetHistory } = runSync({});
    expect(outcome).toBe("noop");
    expect(setContent).not.toHaveBeenCalled();
    expect(resetHistory).not.toHaveBeenCalled();
  });

  it("skips autosave echo without resetting history", () => {
    const { outcome, setContent, resetHistory } = runSync({
      contentChangedExternally: true,
      editorContentJson: sampleDoc,
      initialContent: sampleDoc,
    });
    expect(outcome).toBe("skipped-echo");
    expect(setContent).not.toHaveBeenCalled();
    expect(resetHistory).not.toHaveBeenCalled();
  });

  it("resets history exactly once after setContent on noteId change", () => {
    const { outcome, setContent, resetHistory, focusStart } = runSync({
      noteChanged: true,
    });
    expect(outcome).toBe("applied");
    expect(setContent).toHaveBeenCalledOnce();
    expect(resetHistory).toHaveBeenCalledOnce();
    expect(focusStart).toHaveBeenCalledOnce();
  });

  it("resets history on external content replace without focus (locale swap)", () => {
    const { outcome, setContent, resetHistory, focusStart } = runSync({
      contentChangedExternally: true,
      initialContent: otherDoc,
      editorContentJson: sampleDoc,
    });
    expect(outcome).toBe("applied");
    expect(setContent).toHaveBeenCalledOnce();
    expect(resetHistory).toHaveBeenCalledOnce();
    expect(focusStart).not.toHaveBeenCalled();
  });

  it("clears content and resets history when switching to empty note", () => {
    const { outcome, clearContent, resetHistory, focusStart } = runSync({
      noteChanged: true,
      initialContent: "",
    });
    expect(outcome).toBe("applied");
    expect(clearContent).toHaveBeenCalledOnce();
    expect(resetHistory).toHaveBeenCalledOnce();
    expect(focusStart).toHaveBeenCalledOnce();
  });
});
