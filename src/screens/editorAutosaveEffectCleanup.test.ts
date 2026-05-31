import { describe, expect, it } from "vitest";
import {
  isDebouncedAutosaveStillCurrent,
  resolveEditorAutosaveContentJson,
  shouldPersistAutosaveOnEditorEffectCleanup,
} from "./editorAutosaveEffectCleanup";

describe("shouldPersistAutosaveOnEditorEffectCleanup", () => {
  it("allows persist when bound note is still active", () => {
    expect(shouldPersistAutosaveOnEditorEffectCleanup("note-a", "note-a")).toBe(
      true,
    );
  });

  it("blocks persist after setActiveNote switched to another note", () => {
    expect(shouldPersistAutosaveOnEditorEffectCleanup("note-a", "note-b")).toBe(
      false,
    );
  });

  it("blocks persist when active note was cleared", () => {
    expect(shouldPersistAutosaveOnEditorEffectCleanup("note-a", null)).toBe(
      false,
    );
  });

  it("blocks persist when bound note id is missing", () => {
    expect(shouldPersistAutosaveOnEditorEffectCleanup(null, "note-a")).toBe(
      false,
    );
  });
});

describe("isDebouncedAutosaveStillCurrent", () => {
  it("returns true when scheduled note is still active", () => {
    expect(isDebouncedAutosaveStillCurrent("note-a", "note-a")).toBe(true);
  });

  it("returns false when editor switched before debounce fired", () => {
    expect(isDebouncedAutosaveStillCurrent("note-a", "note-b")).toBe(false);
  });
});

describe("resolveEditorAutosaveContentJson", () => {
  const stalePending = JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "intro Q" }],
      },
    ],
  });
  const liveEditorJson = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "intro Q" }],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "bullet Z" }],
              },
            ],
          },
        ],
      },
    ],
  };

  it("prefers live editor JSON over stale pending ref on switch flush", () => {
    const editor = {
      isDestroyed: false,
      getJSON: () => liveEditorJson,
    };
    expect(
      resolveEditorAutosaveContentJson({
        editor,
        pendingContentJson: stalePending,
      }),
    ).toBe(JSON.stringify(liveEditorJson));
  });

  it("falls back to pending ref when editor is unavailable", () => {
    expect(
      resolveEditorAutosaveContentJson({
        editor: null,
        pendingContentJson: stalePending,
      }),
    ).toBe(stalePending);
  });

  it("falls back to pending ref when editor is destroyed", () => {
    expect(
      resolveEditorAutosaveContentJson({
        editor: { isDestroyed: true, getJSON: () => liveEditorJson },
        pendingContentJson: stalePending,
      }),
    ).toBe(stalePending);
  });
});
