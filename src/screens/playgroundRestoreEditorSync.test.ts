import { describe, expect, it } from "vitest";
import {
  createPlaygroundRestoreSession,
  shouldStashAutosaveOnEffectCleanup,
} from "./playgroundRestoreEditorSync";

describe("shouldStashAutosaveOnEffectCleanup", () => {
  it("skips stashing while in-session playground restore is active", () => {
    expect(shouldStashAutosaveOnEffectCleanup(true)).toBe(false);
  });

  it("allows stashing during normal editor lifecycle", () => {
    expect(shouldStashAutosaveOnEffectCleanup(false)).toBe(true);
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
