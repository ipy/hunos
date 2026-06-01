import { describe, expect, it } from "vitest";
import { formatBacklinkSnippet } from "@/components/backlinks/formatBacklinkSnippet";
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
