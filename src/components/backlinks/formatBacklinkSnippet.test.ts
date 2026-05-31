import { describe, expect, it } from "vitest";
import { formatBacklinkSnippet } from "./formatBacklinkSnippet";

describe("formatBacklinkSnippet", () => {
  it("unwraps wiki links and inline marks for playground-style context", () => {
    const raw = "... 详见 [[项目文档]] 与 [[项目文档]]。...";
    expect(formatBacklinkSnippet(raw)).toBe(
      "... 详见 项目文档 与 项目文档。...",
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
});
