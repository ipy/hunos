import { describe, expect, it } from "vitest";
import {
  filterNotesByTitleFirstSearch,
  noteSearchMatchFlags,
} from "./noteSearchRank";

describe("noteSearchRank", () => {
  const playground = {
    title: "格式试炼场",
    contentPlain: "用标签 #hunos/格式测试 并链接 [[欢迎使用 Hunos]]。",
  };
  const welcome = {
    title: "欢迎使用 Hunos",
    contentPlain:
      "欢迎使用 Hunos。Hunos 是一款美观的、支持知识图谱的笔记应用。",
  };

  it("flags title and body matches independently", () => {
    expect(noteSearchMatchFlags(welcome, "欢迎")).toEqual({
      titleMatch: true,
      bodyMatch: true,
    });
    expect(noteSearchMatchFlags(playground, "欢迎")).toEqual({
      titleMatch: false,
      bodyMatch: true,
    });
  });

  it("returns title matches only when any title matches (AC37-search-title-first)", () => {
    const results = filterNotesByTitleFirstSearch(
      [playground, welcome],
      "欢迎",
    );
    expect(results.map((n) => n.title)).toEqual(["欢迎使用 Hunos"]);
  });

  it("falls back to body matches when no title matches", () => {
    const bodyOnly = {
      title: "Meeting notes",
      contentPlain: "Discussed onboarding welcome flow.",
    };
    const results = filterNotesByTitleFirstSearch([bodyOnly], "welcome");
    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe("Meeting notes");
  });

  it("returns empty for blank query", () => {
    expect(filterNotesByTitleFirstSearch([welcome], "   ")).toEqual([]);
  });
});
