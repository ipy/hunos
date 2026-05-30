import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("editor overlay layers", () => {
  it("keeps the format toolbar above more-actions and stats backdrops so QA can still bold or list", () => {
    const editor = readFileSync(
      resolve(process.cwd(), "src/screens/EditorScreen.tsx"),
      "utf8",
    );
    const infoPanel = readFileSync(
      resolve(process.cwd(), "src/components/editor/InfoPanel.tsx"),
      "utf8",
    );
    const toolbar = readFileSync(
      resolve(process.cwd(), "src/components/editor/EditorToolbar.tsx"),
      "utf8",
    );

    expect(editor).toContain('data-testid="editor-toolbar-layer"');
    expect(editor).toContain("zIndex: 65");
    expect(editor).toContain("formatOverlayOpen={showActions || showStats}");
    expect(editor).toContain('data-testid="editor-more-actions-backdrop"');
    expect(infoPanel).toContain('data-testid="stats-panel-backdrop"');
    expect(infoPanel).toContain("zIndex: 48");
    expect(toolbar).toContain("runToolbarActionWithOverlaySelection");
    expect(toolbar).toContain('data-testid="editor-toolbar"');
  });

  it("wires Escape through dismissEditorOverlayOnEscape", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/screens/EditorScreen.tsx"),
      "utf8",
    );

    expect(source).toContain("dismissEditorOverlayOnEscape");
    expect(source).toContain('t("common.actions.more")');
    expect(source).not.toContain('defaultValue: "More actions"');
  });
});
