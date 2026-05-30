import { create } from "zustand";
import type { Tag, TagTreeNode } from "@/types/graph";
import { tagStorage } from "@/storage/tagStorage";
import { isValidTagName } from "@/utils/tagPattern";

function appendUniqueChild(parent: TagTreeNode, child: TagTreeNode): void {
  const existing = parent.children.find(
    (candidate) => candidate.displayName === child.displayName,
  );
  if (existing) {
    existing.noteCount += child.noteCount;
    return;
  }
  parent.children.push(child);
}

function findParentNode(
  node: TagTreeNode,
  nodeMap: Map<string, TagTreeNode>,
): TagTreeNode | null {
  if (node.parentId) {
    const byId = nodeMap.get(node.parentId);
    if (byId) return byId;
  }
  if (!node.name.includes("/")) return null;
  const parentName = node.name.split("/").slice(0, -1).join("/");
  for (const candidate of nodeMap.values()) {
    if (candidate.id !== node.id && candidate.name === parentName) {
      return candidate;
    }
  }
  return null;
}

function subtreeHasNotes(node: TagTreeNode): boolean {
  if (node.noteCount > 0) return true;
  return node.children.some(subtreeHasNotes);
}

/** Expand ancestors on paths to tags that carry notes so nested tags stay discoverable. */
export function applyAutoExpandPaths(nodes: TagTreeNode[]): void {
  for (const node of nodes) {
    if (node.children.length > 0) {
      applyAutoExpandPaths(node.children);
      node.isExpanded = node.children.some(subtreeHasNotes);
    }
  }
}

export function buildTree(tags: Tag[]): TagTreeNode[] {
  tags = tags.filter((t) => isValidTagName(t.name));
  const nodeMap = new Map<string, TagTreeNode>();
  tags.forEach((t) =>
    nodeMap.set(t.id, { ...t, children: [], isExpanded: false }),
  );

  const roots: TagTreeNode[] = [];
  nodeMap.forEach((node) => {
    const parent = findParentNode(node, nodeMap);
    if (parent) {
      appendUniqueChild(parent, node);
    } else {
      const existingRoot = roots.find(
        (existing) => existing.displayName === node.displayName,
      );
      if (existingRoot) {
        existingRoot.noteCount += node.noteCount;
      } else {
        roots.push(node);
      }
    }
  });

  roots.sort((a, b) => a.name.localeCompare(b.name));
  const sortChildren = (nodes: TagTreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortChildren(n.children));
  };
  sortChildren(roots);
  applyAutoExpandPaths(roots);

  return roots;
}

interface TagStore {
  tags: Tag[];
  tagTree: TagTreeNode[];
  activeTagId: string | null;
  isLoading: boolean;

  loadTags: () => Promise<void>;
  setActiveTag: (id: string | null) => void;
  toggleExpand: (id: string) => void;
}

export const useTagStore = create<TagStore>((set, get) => ({
  tags: [],
  tagTree: [],
  activeTagId: null,
  isLoading: false,

  loadTags: async () => {
    set({ isLoading: true });
    await tagStorage.deleteInvalid();
    await tagStorage.cleanOrphaned();
    const tags = (await tagStorage.listAll()).filter((t) =>
      isValidTagName(t.name),
    );
    const tagTree = buildTree(tags);
    set({ tags, tagTree, isLoading: false });
  },

  setActiveTag: (id) => set({ activeTagId: id }),

  toggleExpand: (id) => {
    const { tagTree } = get();
    const toggle = (nodes: TagTreeNode[]): TagTreeNode[] =>
      nodes.map((n) => ({
        ...n,
        isExpanded: n.id === id ? !n.isExpanded : n.isExpanded,
        children: toggle(n.children),
      }));
    set({ tagTree: toggle(tagTree) });
  },
}));
