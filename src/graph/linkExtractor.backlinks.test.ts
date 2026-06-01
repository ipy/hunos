import { describe, expect, it } from "vitest";
import {
  extractPlainTextForGraphSync,
  graphHeadingOffsetsFromJson,
  sectionForWikiLinkAtOffset,
  sectionHeadingAtOffset,
  trailingSectionAfterWikiLink,
  disambiguateBacklinkContexts,
  extractBacklinkContext,
  backlinkContextWithSection,
  sectionHeadingFromBacklinkPrefix,
} from "./linkExtractor";
import { buildPlaygroundContent } from "@/storage/formatPlaygroundNote";
import { splitBacklinkSnippetParts } from "@/components/backlinks/formatBacklinkSnippet";

describe("graphPlainText heading offsets", () => {
  it("aligns stored heading offsets with plain text positions", () => {
    const content = buildPlaygroundContent("zh");
    const plain = extractPlainTextForGraphSync(content);
    const headings = graphHeadingOffsetsFromJson(content);

    for (const heading of headings) {
      expect(plain.indexOf(`${heading.title}\n`)).toBe(heading.offset);
    }
  });
});

describe("trailingSectionAfterWikiLink", () => {
  it("returns null when another wiki link follows on the same line", () => {
    const plain =
      "标签与链接\n详见 [[项目文档]] 与 [[项目文档]] #42。\n自由试炼\n";
    const headings = [
      { offset: 0, title: "标签与链接" },
      { offset: 40, title: "自由试炼" },
    ];
    expect(
      trailingSectionAfterWikiLink(
        plain,
        plain.indexOf("[[项目文档]]"),
        headings,
      ),
    ).toBeNull();
  });

  it("returns the next-line section when the link tail is not followed by another link", () => {
    const plain =
      "标签与链接\n详见 [[项目文档]] 与 [[项目文档]] #42。\n自由试炼\n";
    const headings = [
      { offset: 0, title: "标签与链接" },
      { offset: 40, title: "自由试炼" },
    ];
    const secondLinkPos = plain.lastIndexOf("[[项目文档]]");
    expect(trailingSectionAfterWikiLink(plain, secondLinkPos, headings)).toBe(
      "自由试炼",
    );
  });
});

describe("sectionForWikiLinkAtOffset", () => {
  it("disambiguates duplicate playground links to 项目文档", () => {
    const content = buildPlaygroundContent("zh");
    const plain = extractPlainTextForGraphSync(content);
    const headings = graphHeadingOffsetsFromJson(content);
    const first = plain.indexOf("[[项目文档]]");
    const second = plain.lastIndexOf("[[项目文档]]");

    expect(sectionHeadingAtOffset(headings, first)).toBe("标签与链接");
    expect(sectionHeadingAtOffset(headings, second)).toBe("标签与链接");
    expect(sectionForWikiLinkAtOffset(plain, first, headings)).toBe(
      "标签与链接",
    );
    expect(sectionForWikiLinkAtOffset(plain, second, headings)).toBe(
      "自由试炼",
    );
  });
});

describe("extractBacklinkContext", () => {
  it("keeps snippet bodies within attributed section bounds for playground links", () => {
    const content = buildPlaygroundContent("zh");
    const plain = extractPlainTextForGraphSync(content);
    const headings = graphHeadingOffsetsFromJson(content);
    const first = plain.indexOf("[[项目文档]]");
    const second = plain.lastIndexOf("[[项目文档]]");

    const tagsCtx = backlinkContextWithSection(
      extractBacklinkContext(plain, first, headings),
      sectionForWikiLinkAtOffset(plain, first, headings),
    );
    const tryCtx = backlinkContextWithSection(
      extractBacklinkContext(plain, second, headings),
      sectionForWikiLinkAtOffset(plain, second, headings),
    );

    const tagsBody = splitBacklinkSnippetParts(tagsCtx).body;
    const tryBody = splitBacklinkSnippetParts(tryCtx).body;

    expect(tagsBody).not.toContain("自由试炼");
    expect(tryBody).not.toContain("标签与链接");
  });
});

describe("sectionHeadingFromBacklinkPrefix", () => {
  it("returns the first segment before the section separator", () => {
    expect(sectionHeadingFromBacklinkPrefix("标签与链接")).toBe("标签与链接");
    expect(sectionHeadingFromBacklinkPrefix("自由试炼 · #1")).toBe("自由试炼");
    expect(sectionHeadingFromBacklinkPrefix("  自由试炼 · #2  ")).toBe("自由试炼");
  });
});

describe("disambiguateBacklinkContexts", () => {
  it("leaves distinct section prefixes unchanged", () => {
    const rows = [
      {
        context: "标签与链接 · ... ctx ...",
        noteTitle: "格式试炼场",
      },
      {
        context: "自由试炼 · ... ctx ...",
        noteTitle: "格式试炼场",
      },
    ];
    expect(disambiguateBacklinkContexts(rows)).toEqual(
      rows.map((row) => row.context),
    );
  });

  it("adds source title hints for colliding section prefixes", () => {
    const [first, second] = disambiguateBacklinkContexts([
      {
        context: "自由试炼 · ... a ...",
        noteTitle: "格式试炼场",
      },
      {
        context: "自由试炼 · ... b ...",
        noteTitle: "Other",
      },
    ]);
    expect(first).toMatch(/^自由试炼 · 格式试炼场 ·/);
    expect(second).toMatch(/^自由试炼 · Other ·/);
  });

  it("treats section + hint as the prefix when re-disambiguating stored rows", () => {
    const rows = disambiguateBacklinkContexts([
      {
        context: "自由试炼 · #1 · ... a ...",
        noteTitle: "项目文档",
      },
      {
        context: "自由试炼 · #2 · ... b ...",
        noteTitle: "项目文档",
      },
    ]);
    expect(rows).toEqual([
      "自由试炼 · #1 · ... a ...",
      "自由试炼 · #2 · ... b ...",
    ]);
  });
});
