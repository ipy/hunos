import type { MarkType, Schema } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";

/** Trailing single-asterisk opener without a closer (e.g. `*未闭合` before Space). */
export const UNCLOSED_SINGLE_STAR_INPUT_RE = /(\*(?!\*)([^*\s]+))$/;

/** Same pattern when Space is the trigger character for input rules. */
export const UNCLOSED_SINGLE_STAR_SPACE_INPUT_RE =
  /(\*(?!\*)([^*\s]+)) $/;

const INLINE_MARK_NAMES = [
  "bold",
  "italic",
  "strike",
  "code",
  "underline",
  "highlight",
  "link",
] as const;

function clearInlineMarksInRange(
  tr: Transaction,
  from: number,
  to: number,
  schema: Schema,
) {
  if (from >= to) {
    return tr;
  }
  for (const markName of INLINE_MARK_NAMES) {
    const markType = schema.marks[markName] as MarkType | undefined;
    if (markType) {
      tr = tr.removeMark(from, to, markType);
    }
  }
  return tr;
}

export function applyUnclosedSingleStarCleanupToTransaction(
  state: EditorState,
  tr: Transaction,
  cursorPos: number,
): boolean {
  const $from = state.doc.resolve(cursorPos);
  if (!$from.parent.isTextblock) {
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
  const starFrom = cursorPos - opener.length;
  const wordFrom = starFrom + 1;
  const wordTo = cursorPos;

  tr.delete(starFrom, starFrom + 1);
  const mappedWordFrom = tr.mapping.map(wordFrom);
  const mappedWordTo = tr.mapping.map(wordTo);
  clearInlineMarksInRange(tr, mappedWordFrom, mappedWordTo, state.schema);
  tr.insertText(" ", mappedWordTo);
  return true;
}

export function buildUnclosedSingleStarCleanupTransaction(
  state: EditorState,
  cursorPos: number,
): Transaction | null {
  const tr = state.tr;
  if (!applyUnclosedSingleStarCleanupToTransaction(state, tr, cursorPos)) {
    return null;
  }
  return tr;
}

export function tryTrimUnclosedSingleStarOnSpace(editor: {
  state: EditorState;
  view: { dispatch: (tr: Transaction) => void };
}): boolean {
  if (!editor.state.selection.empty) {
    return false;
  }

  const tr = buildUnclosedSingleStarCleanupTransaction(
    editor.state,
    editor.state.selection.from,
  );
  if (!tr) {
    return false;
  }

  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

export function applyUnclosedSingleStarSpaceInputRule(options: {
  state: EditorState;
  tr: Transaction;
  range: { from: number; to: number };
}): boolean {
  return applyUnclosedSingleStarCleanupToTransaction(
    options.state,
    options.tr,
    options.range.to,
  );
}
