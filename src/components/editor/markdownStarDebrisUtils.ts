import type { EditorState } from "@tiptap/pm/state";

/** Trailing single-asterisk opener without a closer (e.g. `*未闭合` before Space). */
export const UNCLOSED_SINGLE_STAR_INPUT_RE =
  /(?:^|[^\s*])(\*(?!\*)([^*\s]+))$/;

export function tryTrimUnclosedSingleStarOnSpace(editor: {
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
  const match = UNCLOSED_SINGLE_STAR_INPUT_RE.exec(textBefore);
  if (!match) {
    return false;
  }

  const opener = match[1];
  const starFrom = $from.pos - opener.length;
  let tr = state.tr.delete(starFrom, starFrom + 1);
  tr = tr.insertText(" ", tr.selection.from);
  editor.view.dispatch(tr);
  return true;
}
