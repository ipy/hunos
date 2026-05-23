import { create } from 'zustand';
import type { Tag, TagTreeNode } from '@/types/graph';
import { tagStorage } from '@/storage/tagStorage';

function buildTree(tags: Tag[]): TagTreeNode[] {
  const nodeMap = new Map<string, TagTreeNode>();
  tags.forEach(t => nodeMap.set(t.id, { ...t, children: [], isExpanded: true }));

  const roots: TagTreeNode[] = [];
  nodeMap.forEach(node => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  roots.sort((a, b) => a.name.localeCompare(b.name));
  const sortChildren = (nodes: TagTreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach(n => sortChildren(n.children));
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
    const tags = await tagStorage.listAll();
    const tagTree = buildTree(tags);
    set({ tags, tagTree, isLoading: false });
  },

  setActiveTag: (id) => set({ activeTagId: id }),

  toggleExpand: (id) => {
    const { tagTree } = get();
    const toggle = (nodes: TagTreeNode[]): TagTreeNode[] =>
      nodes.map(n => ({
        ...n,
        isExpanded: n.id === id ? !n.isExpanded : n.isExpanded,
        children: toggle(n.children),
      }));
    set({ tagTree: toggle(tagTree) });
  },
}));
