import { describe, expect, it } from "vitest";
import en from "@/i18n/en.json";
import zh from "@/i18n/zh.json";

describe("shell sidebar labels", () => {
  it("localizes zh sidebar chrome", () => {
    expect(zh.tags.sections.tags).toBe("标签");
    expect(zh.notes.list.pinned).toBe("置顶");
    expect(zh.notes.actions.createNote).toBe("创建新笔记");
    expect(zh.common.actions.more).toBe("更多操作");
  });

  it("defines en sidebar chrome keys", () => {
    expect(en.tags.sections.tags).toBe("Tags");
    expect(en.notes.list.pinned).toBe("Pinned");
    expect(en.notes.actions.createNote).toBe("Create new note");
    expect(en.common.actions.more).toBe("More actions");
  });

  it("localizes zh export menu labels without bare Markdown or HTML toggles", () => {
    expect(zh.export.markdown).toBe("导出 Markdown");
    expect(zh.export.html).toBe("导出 HTML");
    expect(zh.export.markdown).not.toBe("Markdown");
    expect(zh.export.html).not.toBe("HTML");
  });

  it("localizes zh task checkbox aria labels without task text echo", () => {
    expect(zh.editor.task.checkboxOpen).toBe("未完成任务");
    expect(zh.editor.task.checkboxDone).toBe("已完成任务");
    expect(zh.editor.task.checkboxOpen).not.toContain("{{text}}");
    expect(zh.editor.task.checkboxOpen).not.toContain("Task item checkbox");
  });
});
