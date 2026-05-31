import { describe, expect, it } from "vitest";
import {
  filterNotesByTitleFirstSearch,
  mergePinnedNotesForSearchDisplay,
  noteSearchBodyPlain,
  noteSearchMatchFlags,
} from "./noteSearchRank";

describe("noteSearchRank", () => {
  const playground = {
    id: "pg-1",
    title: "格式试炼场",
    contentPlain: "用标签 #hunos/格式测试 并链接 [[欢迎使用 Hunos]]。",
    isPinned: true,
  };
  const welcome = {
    id: "welcome-1",
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
      bodyMatch: false,
    });
  });

  it("does not treat wiki-link targets as body hits (AC37-search-title-first)", () => {
    expect(noteSearchBodyPlain(playground.contentPlain)).not.toContain("欢迎");
    expect(noteSearchMatchFlags(playground, "欢迎")).toEqual({
      titleMatch: false,
      bodyMatch: false,
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

  it("keeps the active pinned note visible during search (AC39-search-restore-ghost)", () => {
    const merged = mergePinnedNotesForSearchDisplay(
      [welcome],
      [playground, welcome],
      { activeNoteId: playground.id },
    );
    expect(merged.map((n) => n.title)).toEqual([
      "格式试炼场",
      "欢迎使用 Hunos",
    ]);
  });

  it("does not inject pinned notes that are not active (AC37-search-title-first)", () => {
    const merged = mergePinnedNotesForSearchDisplay(
      [welcome],
      [playground, welcome],
    );
    expect(merged.map((n) => n.title)).toEqual(["欢迎使用 Hunos"]);
  });

  it("does not duplicate pinned notes already in search results", () => {
    const pinnedPlayground = { ...playground, isPinned: true };
    const merged = mergePinnedNotesForSearchDisplay(
      [pinnedPlayground],
      [pinnedPlayground, welcome],
      { activeNoteId: pinnedPlayground.id },
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.title).toBe("格式试炼场");
  });
});
