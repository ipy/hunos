import type { EditorState } from "@tiptap/pm/state";
import { findCompleteTagsInBlock } from "./tagSuggestionUtils";
import {
  isInCodeContext,
  isRangeIntersectingWikiLink,
} from "./wikiLinkSuggestionUtils";

export function isAutolinkRangeBlocked(
  state: EditorState,
  from: number,
  to: number,
): boolean {
  const $from = state.doc.resolve(from);
  if (isInCodeContext($from)) {
    return true;
  }

  if (isRangeIntersectingWikiLink(state, from, to)) {
    return true;
  }

  const urlText = state.doc.textBetween(from, to, "\0", "\0");
  if (urlText.startsWith("#")) {
    return true;
  }

  const blockStart = $from.start();
  const blockText = state.doc.textBetween(blockStart, $from.end(), "\n", "\n");
  const fromOffset = from - blockStart;
  const toOffset = to - blockStart;

  for (const tag of findCompleteTagsInBlock(blockText)) {
    if (toOffset > tag.start && fromOffset < tag.end) {
      return true;
    }
  }

  return false;
}

export function shouldAutolinkUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return false;
  }
  return true;
}
