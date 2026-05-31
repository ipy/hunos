import { describe, expect, it } from "vitest";
import {
  backlinkSnippetHasRawMarkdown,
  formatBacklinkSnippet,
} from "./formatBacklinkSnippet";

describe("formatBacklinkSnippet", () => {
  it("unwraps wiki links and inline marks for playground-style context", () => {
    const raw = "... 详见 [[项目文档]] 与 [[项目文档]] #42。...";
    expect(formatBacklinkSnippet(raw)).toBe(
      "... 详见 项目文档 与 项目文档 #42。...",
    );
  });

  it("strips bold, heading hashes, and tag hashes", () => {
    expect(formatBacklinkSnippet("## Heading with **bold** and #tag")).toBe(
      "Heading with bold and tag",
    );
  });

  it("preserves plain CJK context without wiki delimiters", () => {
    expect(formatBacklinkSnippet("格式试炼场中的示例笔记")).toBe(
      "格式试炼场中的示例笔记",
    );
  });

  it("unwraps inline links and images (AC59-backlink-snippet-format)", () => {
    expect(formatBacklinkSnippet("See [docs](https://x.test) ok")).toBe(
      "See docs ok",
    );
    expect(formatBacklinkSnippet("Shot ![alt](img.png) here")).toBe(
      "Shot alt here",
    );
    expect(formatBacklinkSnippet("**bold [[项目文档]]** tail")).toBe(
      "bold 项目文档 tail",
    );
  });

  it("leaves plain issue refs with hash while stripping tag tokens", () => {
    const out = formatBacklinkSnippet("fix #42 and #hunos/格式测试");
    expect(out).toContain("#42");
    expect(out).not.toContain("#hunos");
    expect(backlinkSnippetHasRawMarkdown(out)).toBe(false);
  });

  it("strips underline delimiters truncated by the context window (AC59-backlink-snippet-hash)", () => {
    const truncated =
      "... 与 项目文档 #42。 自由试炼 输入 粗体、斜体、__下划线, sibling...";
    const out = formatBacklinkSnippet(truncated);
    expect(out).toContain("下划线");
    expect(out).not.toContain("__");
    expect(backlinkSnippetHasRawMarkdown(out)).toBe(false);
  });
});
