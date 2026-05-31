import type { Editor } from "@tiptap/react";

export interface TableControlItem {
  id: string;
  icon: string;
  labelKey: string;
  action: (editor: Editor) => boolean;
  canExecute: (editor: Editor) => boolean;
}

export const TABLE_CONTROL_ITEMS: TableControlItem[] = [
  {
    id: "addRowAfter",
    icon: "rowAddBelow",
    labelKey: "editor.table.addRowBelow",
    action: (editor) => editor.commands.addRowAfter(),
    canExecute: (editor) => editor.can().addRowAfter(),
  },
  {
    id: "addColumnAfter",
    icon: "colAddRight",
    labelKey: "editor.table.addColumnRight",
    action: (editor) => editor.commands.addColumnAfter(),
    canExecute: (editor) => editor.can().addColumnAfter(),
  },
  {
    id: "deleteRow",
    icon: "rowDelete",
    labelKey: "editor.table.deleteRow",
    action: (editor) => editor.commands.deleteRow(),
    canExecute: (editor) => editor.can().deleteRow(),
  },
  {
    id: "deleteColumn",
    icon: "colDelete",
    labelKey: "editor.table.deleteColumn",
    action: (editor) => editor.commands.deleteColumn(),
    canExecute: (editor) => editor.can().deleteColumn(),
  },
];

export function isTableControlContext(editor: Editor): boolean {
  return editor.isActive("table");
}
