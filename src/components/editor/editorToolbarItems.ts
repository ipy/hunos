export type EditorToolbarTab = "format" | "blocks" | "insert";

export type DesktopToolbarTab = "format" | "blocks";

/** Mobile toolbar shows one tab strip at a time — no inline+block hybrid row. */
export function resolveMobileToolbarItems<T>(
  activeTab: EditorToolbarTab,
  items: Record<EditorToolbarTab, T[]>,
): T[] {
  return items[activeTab];
}

/** Desktop toolbar: Aa = inline marks; ¶ = block + insert (no 20-button hybrid row). */
export function resolveDesktopToolbarItems<T>(
  activeTab: DesktopToolbarTab,
  items: Record<EditorToolbarTab, T[]>,
): T[] {
  if (activeTab === "format") {
    return items.format;
  }
  return [...items.blocks, ...items.insert];
}
