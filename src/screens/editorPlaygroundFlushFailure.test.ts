import { beforeEach, describe, expect, it, vi } from "vitest";

const showToast = vi.fn();

vi.mock("@/store/uiStore", () => ({
  useUIStore: {
    getState: () => ({ showToast }),
  },
}));

vi.mock("@/i18n", () => ({
  default: {
    t: (key: string) => key,
  },
}));

const stashEditorAutosaveSnapshot = vi.fn();

vi.mock("@/store/editorAutosaveRegistry", () => ({
  stashEditorAutosaveSnapshot: (...args: unknown[]) =>
    stashEditorAutosaveSnapshot(...args),
  registerEditorAutosaveFlush: vi.fn(),
  unregisterEditorAutosaveFlush: vi.fn(),
  registerUnloadDraftCollector: vi.fn(),
  unregisterUnloadDraftCollector: vi.fn(),
  peekStashedEditorAutosaveForNote: vi.fn(),
  takeStashedEditorAutosaveForNote: vi.fn(),
  clearStashedEditorAutosave: vi.fn(),
}));

import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("EditorScreen playground flush failure stash", () => {
  beforeEach(() => {
    stashEditorAutosaveSnapshot.mockClear();
  });

  it("stashes playground content when lifecycle flush cannot persist", () => {
    const source = readFileSync(
      join(process.cwd(), "src/screens/EditorScreen.tsx"),
      "utf-8",
    );
    expect(source).toContain("stashEditorAutosaveSnapshot(activeNoteId, json)");
    expect(source).toContain("if (contentOk) {");
    expect(source).toContain("pendingContentRef.current = null;");
    expect(source).not.toMatch(
      /if \(isPlayground\) \{\s*const contentOk = await persistEditorContent/,
    );
  });

  it("stashes orphan pending content when leaving a note", () => {
    const source = readFileSync(
      join(process.cwd(), "src/screens/EditorScreen.tsx"),
      "utf-8",
    );
    expect(source).toContain(
      "const leavingNoteId = prevActiveNoteIdRef.current",
    );
    expect(source).toContain(
      "stashEditorAutosaveSnapshot(leavingNoteId, orphan)",
    );
  });
});

describe("EditorScreen mark-only restore chip suppression", () => {
  it("suppresses restore chip before async restore completes and on canonical mark-only edits", () => {
    const source = readFileSync(
      join(process.cwd(), "src/screens/EditorScreen.tsx"),
      "utf-8",
    );
    expect(source).toMatch(
      /applyRestoreChipSuppressed\(true\)[\s\S]*restoreSession\.begin/,
    );
    expect(source).toContain("formatPlaygroundMatchesCanonicalSeed(");
    expect(source).toMatch(
      /formatPlaygroundMatchesCanonicalSeed\([\s\S]*applyRestoreChipSuppressed\(true\)/,
    );
  });
});
