import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "@/types/note";

const list = vi.fn();
const syncNoteLinks = vi.fn();
const cleanOrphaned = vi.fn();
const repairMissingParents = vi.fn();

vi.mock("./noteStorage", () => ({
  noteStorage: {
    list: (...args: unknown[]) => list(...args),
  },
}));

vi.mock("./tagStorage", () => ({
  tagStorage: {
    cleanOrphaned: () => cleanOrphaned(),
    repairMissingParents: () => repairMissingParents(),
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
    repairMissingParents.mockReset();
    syncNoteLinks.mockResolvedValue(undefined);
    cleanOrphaned.mockResolvedValue(0);
    repairMissingParents.mockResolvedValue(0);
  });

  it("re-syncs welcome and playground from locale seed content for en", async () => {
    const notes: Note[] = [
      {
        id: "welcome",
        title: "Welcome to Hunos",
        content: '{"type":"doc","content":[{"type":"paragraph","content":[]}]}',
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
    const {
      getBootstrapPlaygroundSeedContent,
      getBootstrapWelcomeSeedContent,
    } = await import("./bootstrapTagSeeds");

    await reconcileBootstrapTags("en");

    expect(syncNoteLinks).toHaveBeenCalledTimes(2);
    expect(syncNoteLinks).toHaveBeenCalledWith(
      "welcome",
      getBootstrapWelcomeSeedContent("en"),
    );
    expect(syncNoteLinks).toHaveBeenCalledWith(
      "playground",
      getBootstrapPlaygroundSeedContent("en"),
    );
    expect(syncNoteLinks).not.toHaveBeenCalledWith("other", expect.anything());
    expect(repairMissingParents).toHaveBeenCalledOnce();
    expect(cleanOrphaned).toHaveBeenCalledOnce();
  });

  it("re-syncs zh seed notes from locale seed content", async () => {
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
    const {
      getBootstrapPlaygroundSeedContent,
      getBootstrapWelcomeSeedContent,
    } = await import("./bootstrapTagSeeds");

    await reconcileBootstrapTags("zh");

    expect(syncNoteLinks).toHaveBeenCalledTimes(2);
    expect(syncNoteLinks).toHaveBeenCalledWith(
      "welcome-zh",
      getBootstrapWelcomeSeedContent("zh"),
    );
    expect(syncNoteLinks).toHaveBeenCalledWith(
      "playground-zh",
      getBootstrapPlaygroundSeedContent("zh"),
    );
    expect(repairMissingParents).toHaveBeenCalledOnce();
    expect(cleanOrphaned).toHaveBeenCalledOnce();
  });
});
