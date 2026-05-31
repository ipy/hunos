import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("EditorToolbar format overlay (iter 17)", () => {
  const toolbar = readFileSync(
    resolve(process.cwd(), "src/components/editor/EditorToolbar.tsx"),
    "utf8",
  );
  const bubble = readFileSync(
    resolve(process.cwd(), "src/components/editor/SelectionBubbleMenu.tsx"),
    "utf8",
  );
  const editorScreen = readFileSync(
    resolve(process.cwd(), "src/screens/EditorScreen.tsx"),
    "utf8",
  );

  it("keeps inline format controls on non-Aa tabs while stats or actions overlay is open", () => {
    expect(toolbar).toContain("formatOverlayOpen && activeTab !== \"format\"");
    expect(toolbar).toContain("[...INLINE_FORMAT_ITEMS, ...mobileTabItems]");
  });

  it("localizes toolbar control labels via shared i18n keys", () => {
    expect(toolbar).toContain("getToolbarItemLabel");
    expect(toolbar).not.toContain("TOOLBAR_I18N_KEYS");
    expect(bubble).toContain("getToolbarItemLabel");
    expect(bubble).not.toMatch(/aria-label=\{item\.label\}/);
  });

  it("hides the selection bubble while format overlay panels are open", () => {
    expect(bubble).toContain("isEditorFormatOverlayPanelOpen");
    expect(editorScreen).toContain("setEditorFormatOverlayPanelOpen");
  });
});
