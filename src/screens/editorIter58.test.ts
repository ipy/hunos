import { describe, expect, it } from "vitest";
import { formatBacklinkSnippet } from "@/components/backlinks/formatBacklinkSnippet";
import zh from "@/i18n/zh.json";

describe("iteration 58 — backlink snippet preview (AC58-backlink-snippet-preview)", () => {
  it("formats stored playground context without wiki or mark delimiters", () => {
    const stored = "... 详见 [[项目文档]] 与 [[项目文档]]。...";
    const preview = formatBacklinkSnippet(stored);
    expect(preview).not.toMatch(/\[\[/);
    expect(preview).not.toMatch(/\*\*/);
    expect(preview).not.toContain("#");
    expect(preview).toContain("项目文档");
  });
});

describe("iteration 58 — backlinks zh labels (AC58-backlinks-e2e)", () => {
  it("uses zh-CN section copy without English outgoing fallback", () => {
    expect(zh.editor.backlinks.title).toBe("反向链接");
    expect(zh.editor.backlinks.incoming).toBe("引用自");
    expect(zh.editor.backlinks.outgoing).toBe("链接到");
    expect(zh.editor.backlinks.outgoing.toUpperCase()).not.toBe("LINKS TO");
  });
});
