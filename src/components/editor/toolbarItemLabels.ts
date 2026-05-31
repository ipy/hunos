import type { TFunction } from "i18next";

export const TOOLBAR_I18N_KEYS: Record<string, string> = {
  bold: "editor.toolbar.bold",
  italic: "editor.toolbar.italic",
  underline: "editor.toolbar.underline",
  strikethrough: "editor.toolbar.strikethrough",
  highlight: "editor.toolbar.highlight",
  link: "editor.toolbar.link",
  heading1: "editor.toolbar.heading1",
  heading2: "editor.toolbar.heading2",
  heading3: "editor.toolbar.heading3",
  list: "editor.toolbar.bulletList",
  orderedList: "editor.toolbar.orderedList",
  taskList: "editor.toolbar.taskList",
  quote: "editor.toolbar.blockquote",
  code: "editor.toolbar.codeBlock",
  divider: "editor.toolbar.horizontalRule",
  image: "editor.toolbar.image",
  camera: "editor.toolbar.camera",
  table: "editor.toolbar.table",
  pencil: "editor.toolbar.sketch",
};

export function getToolbarItemLabel(
  t: TFunction,
  icon: string,
  fallbackLabel: string,
): string {
  return t(TOOLBAR_I18N_KEYS[icon] ?? icon, {
    defaultValue: fallbackLabel,
  });
}
