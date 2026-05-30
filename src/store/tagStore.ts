import { create } from "zustand";
import type { Tag, TagTreeNode } from "@/types/graph";
import { tagStorage } from "@/storage/tagStorage";
import { getTagDisplayName, isValidTagName } from "@/utils/tagPattern";

const SYNTHETIC_PARENT_PREFIX = "__parent__:";

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

/** Depth from `node` to the nearest noted descendant; -1 when none exist. */
function nearestNotedDepth(node: TagTreeNode, depth = 0): number {
  if (node.noteCount > 0) return depth;
  let nearest = -1;
  for (const child of node.children) {
    const childDepth = nearestNotedDepth(child, depth + 1);
    if (childDepth >= 0) {
      nearest = nearest < 0 ? childDepth : Math.min(nearest, childDepth);
    }
  }
  return nearest;
}

/** Materialize slash-path parents missing from storage so nested tags stay grouped. */
function ensureIntermediateParents(nodeMap: Map<string, TagTreeNode>): void {
  const byName = new Map<string, TagTreeNode>();
  for (const node of nodeMap.values()) {
    byName.set(node.name, node);
  }

  for (const node of [...nodeMap.values()]) {
    if (!node.name.includes("/")) continue;
    const segments = node.name.split("/");
    for (let depth = segments.length - 1; depth >= 1; depth--) {
      const parentName = segments.slice(0, depth).join("/");
      if (byName.has(parentName)) continue;

      const grandparentName =
        depth > 1 ? segments.slice(0, depth - 1).join("/") : null;
      const grandparent = grandparentName ? byName.get(grandparentName) : null;
      const synthetic: TagTreeNode = {
        id: `${SYNTHETIC_PARENT_PREFIX}${parentName}`,
        name: parentName,
        displayName: getTagDisplayName(parentName),
        parentId: grandparent?.id ?? null,
        noteCount: 0,
        createdAt: 0,
        children: [],
        isExpanded: false,
      };
      nodeMap.set(synthetic.id, synthetic);
      byName.set(parentName, synthetic);
    }
  }
}

/** Nest legacy format-test / 格式测试 roots under hunos so the sidebar shows one root. */
function reparentBootstrapFormatRoots(roots: TagTreeNode[]): void {
  const hunos = roots.find((node) => node.name === "hunos");
  if (!hunos) return;

  const formatRoot = roots.find(
    (node) => node.name === "format-test" || node.name === "格式测试",
  );
  if (!formatRoot || formatRoot === hunos) return;

  roots.splice(roots.indexOf(formatRoot), 1);
  appendUniqueChild(hunos, formatRoot);
}

/** Expand only when noted leaves sit below immediate children (bootstrap stays collapsible). */
export function applyAutoExpandPaths(nodes: TagTreeNode[]): void {
  for (const node of nodes) {
    if (node.children.length > 0) {
      applyAutoExpandPaths(node.children);
      node.isExpanded = nearestNotedDepth(node) >= 2;
    }
  }
}

export function buildTree(tags: Tag[]): TagTreeNode[] {
  tags = tags.filter((t) => isValidTagName(t.name));
  const nodeMap = new Map<string, TagTreeNode>();
  tags.forEach((t) =>
    nodeMap.set(t.id, { ...t, children: [], isExpanded: false }),
  );
  ensureIntermediateParents(nodeMap);

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

  reparentBootstrapFormatRoots(roots);
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
    await tagStorage.repairMissingParents();
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
