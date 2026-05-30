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

function buildTree(tags: Tag[]): TagTreeNode[] {
  tags = tags.filter((t) => isValidTagName(t.name));
  const nodeMap = new Map<string, TagTreeNode>();
  tags.forEach((t) =>
    nodeMap.set(t.id, { ...t, children: [], isExpanded: true }),
  );

  const roots: TagTreeNode[] = [];
  nodeMap.forEach((node) => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      appendUniqueChild(nodeMap.get(node.parentId)!, node);
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
