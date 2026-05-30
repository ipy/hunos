import { describe, expect, it } from "vitest";
import { getBootstrapSeedTagNames } from "@/storage/bootstrapTagSeeds";
import { getTagDisplayName } from "@/utils/tagPattern";
import type { Tag } from "@/types/graph";

function tagsFromBootstrap(locale: "en" | "zh"): Tag[] {
  const names = getBootstrapSeedTagNames(locale);
  const tags: Tag[] = [];
  let createdAt = 1;
  for (const name of names) {
    let parentId: string | null = null;
    if (name.includes("/")) {
      const parentName = name.split("/").slice(0, -1).join("/");
      parentId = tags.find((tag) => tag.name === parentName)?.id ?? null;
    }
    tags.push({
      id: `tag-${createdAt}`,
      name,
      displayName: getTagDisplayName(name),
      parentId,
      noteCount: 1,
      createdAt: createdAt++,
    });
  }
  return tags;
}

function countDisplayNameInTree(
  nodes: Array<{ displayName: string; children: typeof nodes }>,
  displayName: string,
): number {
  let count = 0;
  for (const node of nodes) {
    if (node.displayName === displayName) count += 1;
    count += countDisplayNameInTree(node.children, displayName);
  }
  return count;
}

function siblingDuplicateDisplayNames(
  nodes: Array<{ displayName: string; children: typeof nodes }>,
): string[] {
  const dupes: string[] = [];
  const seen = new Set<string>();
  for (const node of nodes) {
    if (seen.has(node.displayName)) {
      dupes.push(node.displayName);
    }
    seen.add(node.displayName);
    dupes.push(...siblingDuplicateDisplayNames(node.children));
  }
  return dupes;
}

describe("bootstrap tag tree", () => {
  it("creates one welcome path under format-test for en fresh boot seeds", async () => {
    const tags = tagsFromBootstrap("en");
    expect(tags.map((tag) => tag.name)).toEqual([
      "format-test",
      "format-test/welcome",
      "hunos",
      "hunos/getting-started",
    ]);

    const { buildTree } = await import("./tagStore");

    const tree = buildTree(tags);
    expect(countDisplayNameInTree(tree, "welcome")).toBe(1);
    expect(siblingDuplicateDisplayNames(tree)).toEqual([]);

    const formatTest = tree.find((node) => node.name === "format-test");
    expect(formatTest?.children.map((child) => child.displayName)).toEqual([
      "welcome",
    ]);
    expect(formatTest?.isExpanded).toBe(false);

    const hunos = tree.find((node) => node.name === "hunos");
    expect(hunos?.children.map((child) => child.displayName)).toEqual([
      "getting-started",
    ]);
    expect(hunos?.isExpanded).toBe(false);
  });

  it("creates one 欢迎 path under 格式测试 for zh fresh boot seeds", async () => {
    const tags = tagsFromBootstrap("zh");
    expect(tags.map((tag) => tag.name)).toEqual([
      "hunos",
      "hunos/入门指南",
      "格式测试",
      "格式测试/欢迎",
    ]);

    const { buildTree } = await import("./tagStore");
    const tree = buildTree(tags);
    expect(countDisplayNameInTree(tree, "欢迎")).toBe(1);
    expect(siblingDuplicateDisplayNames(tree)).toEqual([]);

    const formatTest = tree.find((node) => node.name === "格式测试");
    expect(formatTest?.children.map((child) => child.displayName)).toEqual([
      "欢迎",
    ]);
    expect(formatTest?.isExpanded).toBe(false);

    const hunos = tree.find((node) => node.name === "hunos");
    expect(hunos?.children.map((child) => child.displayName)).toEqual([
      "入门指南",
    ]);
    expect(hunos?.isExpanded).toBe(false);
  });

  it("keeps bootstrap branches collapsed until the user expands once", async () => {
    const tags = tagsFromBootstrap("zh");
    const { buildTree } = await import("./tagStore");
    const tree = buildTree(tags);

    const formatTest = tree.find((node) => node.name === "格式测试");
    expect(formatTest?.isExpanded).toBe(false);
    expect(formatTest?.children[0]?.displayName).toBe("欢迎");

    const hunos = tree.find((node) => node.name === "hunos");
    expect(hunos?.isExpanded).toBe(false);
    expect(hunos?.children[0]?.displayName).toBe("入门指南");
  });

  it("nests 入门指南 under hunos when parentId is missing", async () => {
    const tags: Tag[] = [
      {
        id: "hunos",
        name: "hunos",
        displayName: "hunos",
        parentId: null,
        noteCount: 0,
        createdAt: 1,
      },
      {
        id: "guide",
        name: "hunos/入门指南",
        displayName: "入门指南",
        parentId: null,
        noteCount: 1,
        createdAt: 2,
      },
      {
        id: "format",
        name: "格式测试",
        displayName: "格式测试",
        parentId: null,
        noteCount: 0,
        createdAt: 3,
      },
      {
        id: "welcome",
        name: "格式测试/欢迎",
        displayName: "欢迎",
        parentId: "format",
        noteCount: 1,
        createdAt: 4,
      },
    ];

    const { buildTree } = await import("./tagStore");
    const tree = buildTree(tags);

    expect(tree.map((node) => node.name).sort()).toEqual(["hunos", "格式测试"]);
    expect(countDisplayNameInTree(tree, "入门指南")).toBe(1);
    expect(
      tree.find((node) => node.name === "hunos")?.children[0]?.displayName,
    ).toBe("入门指南");
  });

  it("surfaces hunos parent when bootstrap storage only has leaf tags", async () => {
    const tags: Tag[] = [
      {
        id: "format-test",
        name: "format-test",
        displayName: "format-test",
        parentId: null,
        noteCount: 1,
        createdAt: 1,
      },
      {
        id: "welcome",
        name: "format-test/welcome",
        displayName: "welcome",
        parentId: null,
        noteCount: 1,
        createdAt: 2,
      },
      {
        id: "getting-started",
        name: "hunos/getting-started",
        displayName: "getting-started",
        parentId: null,
        noteCount: 1,
        createdAt: 3,
      },
    ];

    const { buildTree } = await import("./tagStore");
    const tree = buildTree(tags);

    expect(tree.map((node) => node.name).sort()).toEqual([
      "format-test",
      "hunos",
    ]);
    expect(
      tree
        .find((node) => node.name === "hunos")
        ?.children.map((child) => child.displayName),
    ).toEqual(["getting-started"]);
    expect(countDisplayNameInTree(tree, "getting-started")).toBe(1);
    expect(
      tree
        .find((node) => node.name === "format-test")
        ?.children.map((child) => child.displayName),
    ).toEqual(["welcome"]);
  });

  it("surfaces hunos parent for zh leaf-only bootstrap storage", async () => {
    const tags: Tag[] = [
      {
        id: "format",
        name: "格式测试",
        displayName: "格式测试",
        parentId: null,
        noteCount: 1,
        createdAt: 1,
      },
      {
        id: "welcome",
        name: "格式测试/欢迎",
        displayName: "欢迎",
        parentId: null,
        noteCount: 1,
        createdAt: 2,
      },
      {
        id: "guide",
        name: "hunos/入门指南",
        displayName: "入门指南",
        parentId: null,
        noteCount: 1,
        createdAt: 3,
      },
    ];

    const { buildTree } = await import("./tagStore");
    const tree = buildTree(tags);

    expect(tree.map((node) => node.name).sort()).toEqual(["hunos", "格式测试"]);
    expect(
      tree
        .find((node) => node.name === "hunos")
        ?.children.map((child) => child.displayName),
    ).toEqual(["入门指南"]);
    expect(countDisplayNameInTree(tree, "入门指南")).toBe(1);
  });
});
