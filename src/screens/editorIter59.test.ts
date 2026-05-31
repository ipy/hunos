import { describe, expect, it } from "vitest";
import {
  backlinkSnippetHasRawMarkdown,
  formatBacklinkSnippet,
} from "@/components/backlinks/formatBacklinkSnippet";
import {
  backlinksItemSnippetTestId,
  backlinksItemTestId,
} from "@/components/backlinks/BacklinksPanel";
import {
  PLAYGROUND_CONTENT_VERSION,
  buildPlaygroundContent,
} from "@/storage/formatPlaygroundNote";

describe("iteration 59 — snippet testids (AC59-backlink-snippet-testid)", () => {
  it("pairs row and snippet testids from the same link id", () => {
    const linkId = "mppmosoy-004-nqniss1y";
    expect(backlinksItemTestId(linkId)).toBe(`backlinks-item-${linkId}`);
    expect(backlinksItemSnippetTestId(linkId)).toBe(
      `backlinks-snippet-${linkId}`,
    );
  });
});

describe("iteration 59 — snippet hash rules (AC59-backlink-snippet-hash)", () => {
  it("allows plain #42 in formatted output while stripping markdown tag tokens", () => {
    const raw = "... 详见 [[项目文档]] 与 [[项目文档]] #42。...";
    const preview = formatBacklinkSnippet(raw);
    expect(preview).toMatch(/#42/);
    expect(preview).not.toMatch(/\[\[/);
    expect(backlinkSnippetHasRawMarkdown(preview)).toBe(false);
  });

  it("cleans underline tokens cut off by the link context radius", () => {
    const raw =
      "... 与 [[项目文档]] #42。 自由试炼 输入 **粗体**、_斜体_、__下划线, sibling...";
    const preview = formatBacklinkSnippet(raw);
    expect(preview).toContain("#42");
    expect(preview).toContain("下划线");
    expect(preview).not.toContain("__");
    expect(backlinkSnippetHasRawMarkdown(preview)).toBe(false);
  });
});

describe("iteration 59 — playground seed issue ref (AC59-backlink-snippet-hash)", () => {
  it("ships #42 plain text in zh tags section at current version", () => {
    expect(PLAYGROUND_CONTENT_VERSION).toBeGreaterThanOrEqual(26);
    const content = buildPlaygroundContent("zh") as {
      content: Array<{
        type: string;
        content?: Array<{ text?: string }>;
      }>;
    };
    const tagsHeading = content.content.findIndex(
      (node) =>
        node.type === "heading" && node.content?.[0]?.text === "标签与链接",
    );
    const tagsText = (content.content[tagsHeading + 1]?.content ?? [])
      .map((node) => node.text ?? "")
      .join("");
    expect(tagsText).toContain(" #42");
    expect(tagsText).toContain("[[项目文档]]");
  });
});

describe("iteration 59 — distinct row context (AC59-backlink-row-context)", () => {
  it("formats two playground contexts to visibly different strings", () => {
    const first = formatBacklinkSnippet(
      "... 详见 [[项目文档]] 与 [[项目文档]] #42。...",
    );
    const second = formatBacklinkSnippet("... 与 [[项目文档]] #42。...");
    expect(first).not.toBe(second);
    expect(first).toContain("详见");
    expect(second).not.toContain("详见");
  });
});
