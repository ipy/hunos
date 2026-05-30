import { describe, expect, it } from "vitest";
import {
  createPlaygroundRestoreSession,
  shouldEndPlaygroundRestoreSession,
  shouldStashAutosaveOnEffectCleanup,
} from "./playgroundRestoreEditorSync";

const restoredContent = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "seed" }] }],
});

const pollutedContent = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "RestorePollutionMarker" }],
    },
  ],
});

const contentMatches = (editor: string, stored: string) => editor === stored;

describe("shouldStashAutosaveOnEffectCleanup", () => {
  it("skips stashing while in-session playground restore is active", () => {
    expect(shouldStashAutosaveOnEffectCleanup(true)).toBe(false);
  });

  it("allows stashing during normal editor lifecycle", () => {
    expect(shouldStashAutosaveOnEffectCleanup(false)).toBe(true);
  });
});

describe("shouldEndPlaygroundRestoreSession", () => {
  it("does not end before the editor reflects restored content", () => {
    expect(
      shouldEndPlaygroundRestoreSession({
        isRestoringPlayground: true,
        hasNoteContent: true,
        editorContentJson: pollutedContent,
        restoredContent,
        editorContentMatchesStoredJson: contentMatches,
      }),
    ).toBe(false);
  });

  it("ends after the editor matches restored store content", () => {
    expect(
      shouldEndPlaygroundRestoreSession({
        isRestoringPlayground: true,
        hasNoteContent: true,
        editorContentJson: restoredContent,
        restoredContent,
        editorContentMatchesStoredJson: contentMatches,
      }),
    ).toBe(true);
  });

  it("ends immediately when restore failed to produce content", () => {
    expect(
      shouldEndPlaygroundRestoreSession({
        isRestoringPlayground: true,
        hasNoteContent: false,
        editorContentJson: pollutedContent,
        restoredContent,
        editorContentMatchesStoredJson: contentMatches,
      }),
    ).toBe(true);
  });
});

describe("createPlaygroundRestoreSession", () => {
  it("tracks restore lifecycle until end", () => {
    const session = createPlaygroundRestoreSession();
    expect(session.isActive()).toBe(false);

    session.begin();
    expect(session.isActive()).toBe(true);

    session.end();
    expect(session.isActive()).toBe(false);
  });
});
