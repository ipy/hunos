import { describe, expect, it } from "vitest";
import {
  backlinkRowAccessibleLabel,
  backlinkSnippetHasRawMarkdown,
  formatBacklinkSnippet,
  splitBacklinkSnippetParts,
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

  it("strips italic delimiters truncated by the context window (AC60-backlink-snippet-delimiters)", () => {
    const truncated =
      "... 与 项目文档 #42。 自由试炼 输入 **粗体**、*斜体, sibling...";
    const out = formatBacklinkSnippet(truncated);
    expect(out).toContain("#42");
    expect(out).toContain("斜体");
    expect(out).not.toContain("*");
    expect(backlinkSnippetHasRawMarkdown(out)).toBe(false);
  });

  it("strips lone underscore italic truncated by the context window", () => {
    const truncated =
      "... 与 项目文档 #42。 自由试炼 输入 **粗体**、_斜体, sibling...";
    const out = formatBacklinkSnippet(truncated);
    expect(out).toContain("斜体");
    expect(out).not.toMatch(/(?<!_)_(?!_)/);
    expect(backlinkSnippetHasRawMarkdown(out)).toBe(false);
  });

  it("preserves section prefix for duplicate-source rows (AC62-backlink-snippet-disambiguate)", () => {
    const tags = formatBacklinkSnippet(
      "标签与链接 · ... 详见 项目文档 与 项目文档 #42。...",
    );
    const tryOwn = formatBacklinkSnippet("自由试炼 · ... 与 项目文档 #42。...");
    expect(tags.startsWith("标签与链接 ·")).toBe(true);
    expect(tryOwn.startsWith("自由试炼 ·")).toBe(true);
    expect(tags).not.toBe(tryOwn);
  });

  it("splits prefix and body for visual separator rendering (AC64-prefix-visual-separator)", () => {
    const parts = splitBacklinkSnippetParts(
      "自由试炼 · ... 与 项目文档 #42。...",
    );
    expect(parts.prefix).toBe("自由试炼");
    expect(parts.body).toMatch(/项目文档 #42/);
  });

  it("joins source title and section with › for row aria-labels (AC66-backlink-row-a11y)", () => {
    expect(
      backlinkRowAccessibleLabel(
        "格式试炼场",
        "标签与链接 · ... 详见 项目文档 ...",
        "Untitled",
      ),
    ).toBe("格式试炼场 › 标签与链接");
    expect(
      backlinkRowAccessibleLabel("格式试炼场", undefined, "Untitled"),
    ).toBe("格式试炼场");
  });
});
