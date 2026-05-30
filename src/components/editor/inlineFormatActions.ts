import i18n from "@/i18n";
import { useUIStore } from "@/store/uiStore";
import {
  hasSavedEditorOverlaySelection,
  isToolbarFormatOverlayOpen,
  runToolbarChain,
} from "@/utils/editorOverlaySelection";
import type { ChainedCommands, Editor } from "@tiptap/react";
import {
  captureLinkEditorSelection,
  clearLinkEditorSelection,
  restoreLinkEditorSelection,
} from "./linkEditorSelection";

export interface InlineFormatItem {
  icon: string;
  label: string;
  action: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
}

export function toggleMark(
  editor: Editor,
  markName: string,
  applyMark: (chain: ChainedCommands) => ChainedCommands,
) {
  const overlayOpen = isToolbarFormatOverlayOpen();
  const useSavedOverlaySelection =
    overlayOpen && hasSavedEditorOverlaySelection();

  if (useSavedOverlaySelection) {
    runToolbarChain(editor, true, (chain) => applyMark(chain));
    return;
  }

  if (editor.isActive(markName)) {
    runToolbarChain(editor, overlayOpen, (chain) =>
      chain.extendMarkRange(markName).unsetMark(markName),
    );
    return;
  }

  runToolbarChain(editor, overlayOpen, (chain) => {
    if (editor.state.selection.empty) {
      const { $from } = editor.state.selection;
      const start = $from.start();
      const end = $from.end();
      if (end > start) {
        chain = chain.setTextSelection({ from: start, to: end });
      }
    }
    return applyMark(chain);
  });
}

export function isValidLinkUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  try {
    const href = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    const parsed = new URL(href);
    const host = parsed.hostname;
    if (!host) return false;
    if (host === "localhost") return true;
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) return true;
    if (!host.includes(".")) return false;
    const tld = host.split(".").pop() ?? "";
    return tld.length >= 2;
  } catch {
    return false;
  }
}

export function normalizeLinkUrl(url: string): string {
  const trimmed = url.trim();
  const href = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
  const parsed = new URL(href);
  if (parsed.pathname === "/" && !trimmed.endsWith("/")) {
    return `${parsed.protocol}//${parsed.host}${parsed.search}${parsed.hash}`;
  }
  return parsed.href;
}

export function getLinkEditorInitialUrl(editor: Editor): string {
  const previousUrl = editor.getAttributes("link").href ?? "";
  return typeof previousUrl === "string" ? previousUrl : "";
}

export function prepareLinkEditor(editor: Editor): void {
  const chain = editor.chain().focus();
  if (editor.isActive("link")) {
    chain.extendMarkRange("link");
  }
  chain.run();
  captureLinkEditorSelection(editor);
}

/** Apply or clear a link mark. Returns false when the URL is invalid. */
export function applyLinkUrl(editor: Editor, url: string): boolean {
  if (editor.isDestroyed) return false;
  restoreLinkEditorSelection(editor);

  const trimmed = url.trim();
  if (!trimmed) {
    if (editor.isActive("link")) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    clearLinkEditorSelection();
    return true;
  }

  if (!isValidLinkUrl(trimmed)) {
    useUIStore.getState().showToast(i18n.t("editor.link.invalidUrl"), "error");
    return false;
  }

  const chain = editor.chain().focus();
  if (editor.isActive("link")) {
    chain.extendMarkRange("link");
  }
  const applied = chain.setLink({ href: normalizeLinkUrl(trimmed) }).run();
  if (!applied) {
    useUIStore.getState().showToast(i18n.t("editor.link.invalidUrl"), "error");
    return false;
  }
  clearLinkEditorSelection();
  return true;
}

export function removeLinkFromEditor(editor: Editor): void {
  if (editor.isDestroyed) return;
  restoreLinkEditorSelection(editor);
  const removed = editor
    .chain()
    .focus()
    .extendMarkRange("link")
    .unsetLink()
    .run();
  if (removed) {
    clearLinkEditorSelection();
  }
}

export function openLinkEditor(editor: Editor): void {
  prepareLinkEditor(editor);
  useUIStore.getState().openLinkEditor();
}

export const INLINE_FORMAT_ITEMS: InlineFormatItem[] = [
  {
    icon: "bold",
    label: "Bold",
    action: (e) => toggleMark(e, "bold", (chain) => chain.toggleBold()),
    isActive: (e) => e.isActive("bold"),
  },
  {
    icon: "italic",
    label: "Italic",
    action: (e) => toggleMark(e, "italic", (chain) => chain.toggleItalic()),
    isActive: (e) => e.isActive("italic"),
  },
  {
    icon: "underline",
    label: "Underline",
    action: (e) =>
      toggleMark(e, "underline", (chain) => chain.toggleUnderline()),
    isActive: (e) => e.isActive("underline"),
  },
  {
    icon: "strikethrough",
    label: "Strikethrough",
    action: (e) => toggleMark(e, "strike", (chain) => chain.toggleStrike()),
    isActive: (e) => e.isActive("strike"),
  },
  {
    icon: "highlight",
    label: "Highlight",
    action: (e) =>
      toggleMark(e, "highlight", (chain) => chain.toggleHighlight()),
    isActive: (e) => e.isActive("highlight"),
  },
  {
    icon: "link",
    label: "Link",
    action: (e) => openLinkEditor(e),
    isActive: (e) => e.isActive("link"),
  },
];
