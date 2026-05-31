import { describe, expect, it } from "vitest";
import { resolveMobileToolbarItems } from "./editorToolbarItems";
import { INLINE_FORMAT_ITEMS } from "./inlineFormatActions";

describe("resolveMobileToolbarItems (iter 18)", () => {
  const format = INLINE_FORMAT_ITEMS;
  const blocks = [{ icon: "heading1" }];
  const insert = [{ icon: "image" }];

  it("returns inline marks only on the Aa tab even when stats overlay is open", () => {
    const items = resolveMobileToolbarItems("format", {
      format,
      blocks,
      insert,
    });
    expect(items).toBe(format);
    expect(items.some((item) => item.icon === "bold")).toBe(true);
    expect(items.some((item) => item.icon === "heading1")).toBe(false);
  });

  it("returns block controls only on the ¶ tab", () => {
    const items = resolveMobileToolbarItems("blocks", {
      format,
      blocks,
      insert,
    });
    expect(items).toBe(blocks);
    expect(items.some((item) => item.icon === "bold")).toBe(false);
  });

  it("returns insert controls only on the + tab", () => {
    const items = resolveMobileToolbarItems("insert", {
      format,
      blocks,
      insert,
    });
    expect(items).toBe(insert);
  });

  it("never merges inline and block strips for one tab", () => {
    const blockItems = resolveMobileToolbarItems("blocks", {
      format,
      blocks,
      insert,
    });
    expect(blockItems.length).toBeLessThan(format.length + blocks.length);
  });
});
