import { describe, expect, it } from "vitest";
import { buildPlaygroundContent } from "@/storage/formatPlaygroundNote";
import { getWelcomeSeed } from "@/storage/welcomeNotes";
import {
  extractFromPlainText,
  extractPlainTextFromTiptap,
} from "@/graph/linkExtractor";
import { getTagDisplayName } from "@/utils/tagPattern";
import type { Tag } from "@/types/graph";

function tagsFromBootstrap(locale: "en" | "zh"): Tag[] {
  const welcome = getWelcomeSeed(locale);
  const playground = buildPlaygroundContent(locale);
  const names = new Set<string>();
  for (const source of [welcome.content, playground]) {
    for (const tag of extractFromPlainText(extractPlainTextFromTiptap(source))
      .tags) {
      names.add(tag.name);
      if (tag.name.includes("/")) {
        names.add(tag.name.split("/").slice(0, -1).join("/"));
      }
    }
  }

  const tags: Tag[] = [];
  let createdAt = 1;
  for (const name of [...names].sort()) {
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
  it("creates one welcome path for en fresh boot seeds", async () => {
    const tags = tagsFromBootstrap("en");
    expect(tags.map((tag) => tag.name)).toEqual([
      "format-test",
      "hunos",
      "hunos/getting-started",
      "hunos/welcome",
    ]);

    const { buildTree } = await import("./tagStore");

    const tree = buildTree(tags);
    expect(countDisplayNameInTree(tree, "welcome")).toBe(1);
    expect(siblingDuplicateDisplayNames(tree)).toEqual([]);

    const hunos = tree.find((node) => node.name === "hunos");
    expect(hunos?.children.map((child) => child.displayName)).toEqual([
      "getting-started",
      "welcome",
    ]);
  });

  it("creates one 欢迎 path for zh fresh boot seeds", async () => {
    const tags = tagsFromBootstrap("zh");
    expect(tags.map((tag) => tag.name)).toEqual([
      "hunos",
      "hunos/入门指南",
      "hunos/欢迎",
      "格式测试",
    ]);

    const { buildTree } = await import("./tagStore");
    const tree = buildTree(tags);
    expect(countDisplayNameInTree(tree, "欢迎")).toBe(1);
    expect(siblingDuplicateDisplayNames(tree)).toEqual([]);

    const hunos = tree.find((node) => node.name === "hunos");
    expect(hunos?.children.map((child) => child.displayName)).toEqual([
      "入门指南",
      "欢迎",
    ]);
  });
});
