import { describe, expect, it } from "vitest";
import { resolveMobileToolbarItems } from "./editorToolbarItems";
import { getToolbarItemLabel, TOOLBAR_I18N_KEYS } from "./toolbarItemLabels";

describe("EditorToolbar format overlay (iter 18)", () => {
  it("keeps each mobile tab exclusive — no inline+block hybrid row", () => {
    const format = [{ icon: "bold" }, { icon: "italic" }];
    const blocks = [{ icon: "heading1" }, { icon: "list" }];
    const insert = [{ icon: "image" }];

    expect(
      resolveMobileToolbarItems("blocks", { format, blocks, insert }),
    ).toEqual(blocks);
    expect(
      resolveMobileToolbarItems("format", { format, blocks, insert }),
    ).toEqual(format);
  });

  it("localizes toolbar control labels via shared i18n keys", () => {
    const t = (key: string, opts?: { defaultValue?: string }) => {
      if (key === TOOLBAR_I18N_KEYS.bold) return "粗体";
      if (key === TOOLBAR_I18N_KEYS.italic) return "斜体";
      return opts?.defaultValue ?? key;
    };

    expect(getToolbarItemLabel(t, "bold", "Bold")).toBe("粗体");
    expect(getToolbarItemLabel(t, "italic", "Italic")).toBe("斜体");
  });
});
