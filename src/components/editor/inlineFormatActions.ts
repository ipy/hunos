import i18n from "@/i18n";
import { useUIStore } from "@/store/uiStore";
import { restoreEditorOverlaySelection } from "@/utils/editorOverlaySelection";
import type { Editor } from "@tiptap/react";
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
  toggleCmd: () => boolean,
) {
  restoreEditorOverlaySelection(editor);
  if (editor.isActive(markName)) {
    editor.chain().focus().extendMarkRange(markName).unsetMark(markName).run();
  } else if (editor.state.selection.empty) {
    const { $from } = editor.state.selection;
    const start = $from.start();
    const end = $from.end();
    if (end > start) {
      editor.chain().focus().setTextSelection({ from: start, to: end }).run();
    }
    toggleCmd();
  } else {
    toggleCmd();
  }
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
    action: (e) =>
      toggleMark(e, "bold", () => e.chain().focus().toggleBold().run()),
    isActive: (e) => e.isActive("bold"),
  },
  {
    icon: "italic",
    label: "Italic",
    action: (e) =>
      toggleMark(e, "italic", () => e.chain().focus().toggleItalic().run()),
    isActive: (e) => e.isActive("italic"),
  },
  {
    icon: "underline",
    label: "Underline",
    action: (e) =>
      toggleMark(e, "underline", () =>
        e.chain().focus().toggleUnderline().run(),
      ),
    isActive: (e) => e.isActive("underline"),
  },
  {
    icon: "strikethrough",
    label: "Strikethrough",
    action: (e) =>
      toggleMark(e, "strike", () => e.chain().focus().toggleStrike().run()),
    isActive: (e) => e.isActive("strike"),
  },
  {
    icon: "highlight",
    label: "Highlight",
    action: (e) =>
      toggleMark(e, "highlight", () =>
        e.chain().focus().toggleHighlight().run(),
      ),
    isActive: (e) => e.isActive("highlight"),
  },
  {
    icon: "link",
    label: "Link",
    action: (e) => openLinkEditor(e),
    isActive: (e) => e.isActive("link"),
  },
];
