export type EditorToolbarTab = "format" | "blocks" | "insert";

/** Mobile toolbar shows one tab strip at a time — no inline+block hybrid row. */
export function resolveMobileToolbarItems<T>(
  activeTab: EditorToolbarTab,
  items: Record<EditorToolbarTab, T[]>,
): T[] {
  return items[activeTab];
}
