import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "@/types/note";

const list = vi.fn();
const syncNoteLinks = vi.fn();
const cleanOrphaned = vi.fn();

vi.mock("./noteStorage", () => ({
  noteStorage: {
    list: (...args: unknown[]) => list(...args),
  },
}));

vi.mock("./tagStorage", () => ({
  tagStorage: {
    cleanOrphaned: () => cleanOrphaned(),
  },
}));

vi.mock("@/graph/graphEngine", () => ({
  graphEngine: {
    syncNoteLinks: (...args: unknown[]) => syncNoteLinks(...args),
  },
}));

describe("reconcileBootstrapTags", () => {
  beforeEach(() => {
    list.mockReset();
    syncNoteLinks.mockReset();
    cleanOrphaned.mockReset();
    syncNoteLinks.mockResolvedValue(undefined);
    cleanOrphaned.mockResolvedValue(0);
  });

  it("re-syncs welcome and playground seed notes then prunes orphans for en", async () => {
    const notes: Note[] = [
      {
        id: "welcome",
        title: "Welcome to Hunos",
        content: '{"type":"doc","content":[]}',
        contentPlain: "",
        status: "active",
        isPinned: false,
        createdAt: 1,
        modifiedAt: 1,
      },
      {
        id: "playground",
        title: "Format Playground",
        content:
          '{"type":"doc","attrs":{"playgroundContentVersion":22},"content":[]}',
        contentPlain: "",
        status: "active",
        isPinned: true,
        createdAt: 2,
        modifiedAt: 2,
      },
      {
        id: "other",
        title: "Meeting Notes",
        content: '{"type":"doc","content":[]}',
        contentPlain: "",
        status: "active",
        isPinned: false,
        createdAt: 3,
        modifiedAt: 3,
      },
    ];
    list.mockResolvedValue(notes);

    const { reconcileBootstrapTags } = await import("./bootstrapTagReconcile");
    await reconcileBootstrapTags("en");

    expect(syncNoteLinks).toHaveBeenCalledTimes(2);
    expect(syncNoteLinks).toHaveBeenCalledWith("welcome", notes[0].content);
    expect(syncNoteLinks).toHaveBeenCalledWith("playground", notes[1].content);
    expect(cleanOrphaned).toHaveBeenCalledOnce();
  });

  it("re-syncs zh seed notes by locale title", async () => {
    list.mockResolvedValue([
      {
        id: "welcome-zh",
        title: "欢迎使用 Hunos",
        content: '{"type":"doc","content":[]}',
        contentPlain: "",
        status: "active",
        isPinned: false,
        createdAt: 1,
        modifiedAt: 1,
      },
      {
        id: "playground-zh",
        title: "格式试炼场",
        content:
          '{"type":"doc","attrs":{"playgroundContentVersion":22},"content":[]}',
        contentPlain: "",
        status: "active",
        isPinned: true,
        createdAt: 2,
        modifiedAt: 2,
      },
    ]);

    const { reconcileBootstrapTags } = await import("./bootstrapTagReconcile");
    await reconcileBootstrapTags("zh");

    expect(syncNoteLinks).toHaveBeenCalledTimes(2);
    expect(cleanOrphaned).toHaveBeenCalledOnce();
  });
});
