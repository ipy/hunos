import { describe, expect, it } from "vitest";
import en from "@/i18n/en.json";
import zh from "@/i18n/zh.json";

describe("shell sidebar labels", () => {
  it("localizes zh sidebar chrome", () => {
    expect(zh.tags.sections.tags).toBe("标签");
    expect(zh.notes.list.pinned).toBe("置顶");
    expect(zh.notes.actions.createNote).toBe("创建新笔记");
  });

  it("defines en sidebar chrome keys", () => {
    expect(en.tags.sections.tags).toBe("Tags");
    expect(en.notes.list.pinned).toBe("Pinned");
    expect(en.notes.actions.createNote).toBe("Create new note");
  });
});
