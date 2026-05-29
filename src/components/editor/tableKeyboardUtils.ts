import type { Editor } from "@tiptap/core";
import { isEditorSuggestionMenuOpen } from "@/utils/editorSuggestionMenu";
import { shouldDeferTabToSuggestionMenu } from "./listOutlineUtils";

export function isTableShortcutContext(editor: Editor): boolean {
  return editor.isActive("table");
}

export function shouldBlockTableShortcutForSuggestionMenu(): boolean {
  return isEditorSuggestionMenuOpen();
}

export function shouldDeferTableTab(
  sink: boolean,
  isSuggestionMenuOpen?: boolean,
): boolean {
  const menuOpen = isSuggestionMenuOpen ?? isEditorSuggestionMenuOpen();
  return shouldDeferTabToSuggestionMenu(sink, menuOpen);
}

export function handleTableTab(
  editor: Editor,
  isSuggestionMenuOpen?: boolean,
): boolean {
  if (!isTableShortcutContext(editor)) {
    return false;
  }

  const menuOpen = isSuggestionMenuOpen ?? isEditorSuggestionMenuOpen();

  if (shouldDeferTableTab(true, menuOpen)) {
    return false;
  }

  if (menuOpen) {
    return true;
  }

  if (editor.commands.goToNextCell()) {
    return true;
  }

  if (!editor.can().addRowAfter()) {
    return false;
  }

  return editor.chain().addRowAfter().goToNextCell().run();
}

export function handleTableShiftTab(
  editor: Editor,
  isSuggestionMenuOpen?: boolean,
): boolean {
  if (!isTableShortcutContext(editor)) {
    return false;
  }

  const menuOpen = isSuggestionMenuOpen ?? isEditorSuggestionMenuOpen();

  if (shouldDeferTableTab(false, menuOpen)) {
    return false;
  }

  if (menuOpen) {
    return true;
  }

  return editor.commands.goToPreviousCell();
}
