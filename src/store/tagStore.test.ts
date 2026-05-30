import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Tag } from "@/types/graph";

const listAll = vi.fn();
const deleteInvalid = vi.fn();
const cleanOrphaned = vi.fn();
const repairMissingParents = vi.fn();

vi.mock("@/storage/tagStorage", () => ({
  tagStorage: {
    listAll: () => listAll(),
    deleteInvalid: () => deleteInvalid(),
    cleanOrphaned: () => cleanOrphaned(),
    repairMissingParents: () => repairMissingParents(),
  },
}));

describe("tagStore tree dedup", () => {
  beforeEach(() => {
    listAll.mockReset();
    deleteInvalid.mockReset();
    cleanOrphaned.mockReset();
    repairMissingParents.mockReset();
    deleteInvalid.mockResolvedValue(0);
    cleanOrphaned.mockResolvedValue(0);
    repairMissingParents.mockResolvedValue(0);
  });

  it("shows one 欢迎 child under 格式测试 when duplicate display names exist", async () => {
    const parent: Tag = {
      id: "parent",
      name: "格式测试",
      displayName: "格式测试",
      parentId: null,
      noteCount: 2,
      createdAt: 1,
    };
    const childA: Tag = {
      id: "child-a",
      name: "格式测试/欢迎",
      displayName: "欢迎",
      parentId: "parent",
      noteCount: 1,
      createdAt: 2,
    };
    const childB: Tag = {
      id: "child-b",
      name: "格式测试/欢迎-alt",
      displayName: "欢迎",
      parentId: "parent",
      noteCount: 1,
      createdAt: 3,
    };

    listAll.mockResolvedValue([parent, childA, childB]);

    const { useTagStore } = await import("./tagStore");
    await useTagStore.getState().loadTags();

    const parentNode = useTagStore
      .getState()
      .tagTree.find((node) => node.id === "parent");
    expect(parentNode?.children).toHaveLength(1);
    expect(parentNode?.children[0]?.displayName).toBe("欢迎");
    expect(parentNode?.children[0]?.noteCount).toBe(2);
  });

  it("shows one welcome child under hunos when duplicate display names exist", async () => {
    const parent: Tag = {
      id: "hunos",
      name: "hunos",
      displayName: "hunos",
      parentId: null,
      noteCount: 2,
      createdAt: 1,
    };
    const childA: Tag = {
      id: "welcome-a",
      name: "hunos/welcome",
      displayName: "welcome",
      parentId: "hunos",
      noteCount: 1,
      createdAt: 2,
    };
    const childB: Tag = {
      id: "welcome-b",
      name: "hunos/welcome-alt",
      displayName: "welcome",
      parentId: "hunos",
      noteCount: 1,
      createdAt: 3,
    };

    listAll.mockResolvedValue([parent, childA, childB]);

    const { useTagStore } = await import("./tagStore");
    await useTagStore.getState().loadTags();

    const parentNode = useTagStore
      .getState()
      .tagTree.find((node) => node.id === "hunos");
    expect(parentNode?.children).toHaveLength(1);
    expect(parentNode?.children[0]?.displayName).toBe("welcome");
    expect(parentNode?.children[0]?.noteCount).toBe(2);
  });

  it("prunes orphaned tags while loading the sidebar tree", async () => {
    listAll.mockResolvedValue([]);

    const { useTagStore } = await import("./tagStore");
    await useTagStore.getState().loadTags();

    expect(cleanOrphaned).toHaveBeenCalledOnce();
    expect(repairMissingParents).toHaveBeenCalledOnce();
  });

  it("auto-expands parents on paths to noted leaf tags", async () => {
    const parent: Tag = {
      id: "format-test",
      name: "format-test",
      displayName: "format-test",
      parentId: null,
      noteCount: 0,
      createdAt: 1,
    };
    const child: Tag = {
      id: "welcome",
      name: "format-test/welcome",
      displayName: "welcome",
      parentId: "format-test",
      noteCount: 1,
      createdAt: 2,
    };

    listAll.mockResolvedValue([parent, child]);

    const { useTagStore } = await import("./tagStore");
    await useTagStore.getState().loadTags();

    const formatTest = useTagStore
      .getState()
      .tagTree.find((node) => node.id === "format-test");
    expect(formatTest?.isExpanded).toBe(true);
    expect(formatTest?.children[0]?.displayName).toBe("welcome");
  });
});
