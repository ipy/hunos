import type { Editor } from "@tiptap/react";
import type { EditorState } from "@tiptap/pm/state";
import {
  applyMarkdownLinkInputToTransaction,
  findMarkdownLinkInputMatch,
} from "./markdownLinkUtils";

export function tryApplyMarkdownLinkOnSpace(editor: {
  state: EditorState;
  view: { dispatch: (tr: import("@tiptap/pm/state").Transaction) => void };
}): boolean {
  const { state } = editor;
  const { $from } = state.selection;
  if (!$from.parent.isTextblock || !state.selection.empty) {
    return false;
  }

  const textBefore = $from.parent.textBetween(
    0,
    $from.parentOffset,
    undefined,
    "\0",
  );
  const match = findMarkdownLinkInputMatch(`${textBefore} `);
  if (!match) {
    return false;
  }

  const trigger = " ";
  const range = {
    from: $from.pos - (match[0].length - trigger.length),
    to: $from.pos,
  };

  const tr = state.tr;
  if (!applyMarkdownLinkInputToTransaction(state, tr, range, match)) {
    return false;
  }

  tr.insertText(" ", range.from + match[1].length);
  editor.view.dispatch(tr);
  return true;
}

/** @deprecated use tryApplyMarkdownLinkOnSpace for Space; kept for Enter handler */
export function tryApplyMarkdownLinkAtCursor(editor: {
  state: EditorState;
  view: { dispatch: (tr: import("@tiptap/pm/state").Transaction) => void };
}): boolean {
  const { state } = editor;
  const { $from } = state.selection;
  if (!$from.parent.isTextblock || !state.selection.empty) {
    return false;
  }

  const textBefore = $from.parent.textBetween(
    0,
    $from.parentOffset,
    undefined,
    "\0",
  );
  const match = findMarkdownLinkInputMatch(textBefore);
  if (!match) {
    return false;
  }

  const range = {
    from: $from.start() + textBefore.length - match[0].length,
    to: $from.pos,
  };

  const tr = state.tr;
  if (!applyMarkdownLinkInputToTransaction(state, tr, range, match)) {
    return false;
  }

  editor.view.dispatch(tr);
  return true;
}
