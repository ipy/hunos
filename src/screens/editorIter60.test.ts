import { describe, expect, it } from "vitest";
import {
  backlinkSnippetHasRawMarkdown,
  formatBacklinkSnippet,
} from "@/components/backlinks/formatBacklinkSnippet";
import {
  backlinksItemSnippetTestId,
  backlinksItemTestId,
} from "@/components/backlinks/BacklinksPanel";
import { graphEngine, stableBacklinkLinkId } from "@/graph/graphEngine";

describe("iteration 60 — stable backlink testids (AC60-backlinks-stable-testid)", () => {
  it("derives row testids from source + position, not session db id", () => {
    const stableId = stableBacklinkLinkId("pg-zh", 142);
    expect(stableId).toBe("pg-zh-pos-142");
    expect(backlinksItemTestId(stableId)).toBe("backlinks-item-pg-zh-pos-142");
    expect(backlinksItemSnippetTestId(stableId)).toBe(
      "backlinks-snippet-pg-zh-pos-142",
    );
  });

  it("exports stableBacklinkLinkId from graphEngine for resync-safe identity", () => {
    expect(stableBacklinkLinkId("a", 0)).not.toBe(stableBacklinkLinkId("a", 1));
    expect(stableBacklinkLinkId("a", 0)).not.toBe(stableBacklinkLinkId("b", 0));
  });
});

describe("iteration 60 — snippet delimiters (AC60-backlink-snippet-delimiters)", () => {
  it("preserves plain #42 while stripping truncated mark tokens", () => {
    const raw =
      "... 与 [[项目文档]] #42。 自由试炼 输入 **粗体**、*斜体, __下划线, sibling...";
    const preview = formatBacklinkSnippet(raw);
    expect(preview).toMatch(/#42/);
    expect(preview).toContain("粗体");
    expect(preview).toContain("斜体");
    expect(preview).toContain("下划线");
    expect(preview).not.toMatch(/\[\[/);
    expect(preview).not.toMatch(/\*\*/);
    expect(preview).not.toMatch(/__/);
    expect(backlinkSnippetHasRawMarkdown(preview)).toBe(false);
  });
});

describe("iteration 60 — graphEngine stable keys (AC60-backlinks-e2e-navigation)", () => {
  it("exposes stableBacklinkLinkId for e2e row re-collection parity", () => {
    expect(typeof graphEngine.getBacklinks).toBe("function");
    expect(stableBacklinkLinkId("source", 99)).toMatch(/-pos-99$/);
  });
});
