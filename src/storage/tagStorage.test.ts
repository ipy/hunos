import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Tag } from "@/types/graph";

const tags = new Map<string, Tag>();
let nextId = 1;

vi.mock("@/utils/uuid", () => ({
  generateId: () => `generated-${nextId++}`,
}));

vi.mock("./database", () => ({
  db: {
    tags: {
      add: async (tag: Tag) => {
        tags.set(tag.id, { ...tag });
      },
      update: async (id: string, updates: Partial<Tag>) => {
        const existing = tags.get(id);
        if (existing) {
          tags.set(id, { ...existing, ...updates });
        }
      },
      bulkDelete: async (ids: string[]) => {
        for (const id of ids) {
          tags.delete(id);
        }
      },
      toArray: async () => [...tags.values()],
      where: () => ({
        equals: (name: string) => ({
          first: async () =>
            [...tags.values()].find((tag) => tag.name === name),
        }),
      }),
    },
    noteTags: {
      where: () => ({
        equals: () => ({
          count: async () => 0,
        }),
      }),
    },
  },
}));

describe("tagStorage orphan cleanup", () => {
  beforeEach(() => {
    tags.clear();
    nextId = 1;
  });

  it("keeps zero-note parents that still have nested children", async () => {
    tags.set("hunos", {
      id: "hunos",
      name: "hunos",
      displayName: "hunos",
      parentId: null,
      noteCount: 0,
      createdAt: 1,
    });
    tags.set("guide", {
      id: "guide",
      name: "hunos/入门指南",
      displayName: "入门指南",
      parentId: "hunos",
      noteCount: 1,
      createdAt: 2,
    });

    const { tagStorage } = await import("./tagStorage");
    expect(await tagStorage.cleanOrphaned()).toBe(0);
    expect(
      [...(await tagStorage.listAll())].map((tag) => tag.name).sort(),
    ).toEqual(["hunos", "hunos/入门指南"]);
  });

  it("recreates missing hunos parent for orphaned leaf tags", async () => {
    tags.set("guide", {
      id: "guide",
      name: "hunos/入门指南",
      displayName: "入门指南",
      parentId: null,
      noteCount: 1,
      createdAt: 1,
    });
    tags.set("gs", {
      id: "gs",
      name: "hunos/getting-started",
      displayName: "getting-started",
      parentId: null,
      noteCount: 1,
      createdAt: 2,
    });

    const { tagStorage } = await import("./tagStorage");
    expect(await tagStorage.repairMissingParents()).toBeGreaterThan(0);

    const names = (await tagStorage.listAll()).map((tag) => tag.name).sort();
    expect(names).toContain("hunos");
    expect(names).toContain("hunos/入门指南");
    expect(names).toContain("hunos/getting-started");

    const hunos = (await tagStorage.listAll()).find(
      (tag) => tag.name === "hunos",
    );
    const guide = (await tagStorage.listAll()).find(
      (tag) => tag.name === "hunos/入门指南",
    );
    expect(guide?.parentId).toBe(hunos?.id);
  });

  it("deletes zero-note leaf tags with no children", async () => {
    tags.set("orphan", {
      id: "orphan",
      name: "orphan",
      displayName: "orphan",
      parentId: null,
      noteCount: 0,
      createdAt: 1,
    });

    const { tagStorage } = await import("./tagStorage");
    expect(await tagStorage.cleanOrphaned()).toBe(1);
    expect(await tagStorage.listAll()).toEqual([]);
  });
});
