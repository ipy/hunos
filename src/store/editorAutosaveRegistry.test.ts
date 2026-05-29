import { describe, expect, it } from "vitest";
import {
  flushEditorAutosave,
  registerEditorAutosaveFlush,
  unregisterEditorAutosaveFlush,
} from "./editorAutosaveRegistry";

describe("editorAutosaveRegistry", () => {
  it("returns null when no editor flush handler is registered", async () => {
    expect(await flushEditorAutosave()).toBeNull();
  });

  it("delegates flush to the registered handler", async () => {
    const handler = async () => '{"type":"doc"}';
    registerEditorAutosaveFlush(handler);
    expect(await flushEditorAutosave()).toBe('{"type":"doc"}');
    unregisterEditorAutosaveFlush(handler);
    expect(await flushEditorAutosave()).toBeNull();
  });
});
