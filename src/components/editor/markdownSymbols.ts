import type { Mark } from "@tiptap/pm/model";

export const MARK_SYMBOLS: Record<string, { open: string; close: string }> = {
  bold: { open: "**", close: "**" },
  italic: { open: "_", close: "_" },
  strike: { open: "~~", close: "~~" },
  code: { open: "`", close: "`" },
  underline: { open: "__", close: "__" },
  highlight: { open: "==", close: "==" },
};

export function getMarkRevealSymbols(
  markName: string,
  mark?: Mark,
): { open: string; close: string } | null {
  if (markName === "link") {
    const href = mark?.attrs.href;
    if (typeof href !== "string" || !href) {
      return null;
    }
    return { open: "[", close: `](${href})` };
  }
  return MARK_SYMBOLS[markName] ?? null;
}
