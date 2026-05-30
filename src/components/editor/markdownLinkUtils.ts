import type { EditorState } from "@tiptap/pm/state";
import type { Transaction } from "@tiptap/pm/state";
import { isValidLinkUrl, normalizeLinkUrl } from "./inlineFormatActions";
import {
  isInCodeContext,
  isRangeIntersectingWikiLink,
} from "./wikiLinkSuggestionUtils";

/** Optional trailing whitespace matches TipTap InputRule `textBefore` (text + trigger char). */
export const MARKDOWN_LINK_INPUT_REGEX = /\[([^\]]+)\]\(([^)]+)\)\s?$/;

type MarkdownLinkMatch = RegExpMatchArray;

export function findMarkdownLinkInputMatch(
  textBeforeCursor: string,
): MarkdownLinkMatch | null {
  return MARKDOWN_LINK_INPUT_REGEX.exec(textBeforeCursor);
}

export function applyMarkdownLinkInputToTransaction(
  state: EditorState,
  tr: Transaction,
  range: { from: number; to: number },
  match: MarkdownLinkMatch,
): boolean {
  const label = match[1];
  const urlRaw = match[2];
  if (!label || !urlRaw) {
    return false;
  }

  const $from = state.doc.resolve(range.from);
  if (isInCodeContext($from)) {
    return false;
  }

  if (isRangeIntersectingWikiLink(state, range.from, range.to)) {
    return false;
  }

  if (!isValidLinkUrl(urlRaw)) {
    return false;
  }

  const linkType = state.schema.marks.link;
  if (!linkType) {
    return false;
  }

  const href = normalizeLinkUrl(urlRaw);
  tr.replaceWith(
    range.from,
    range.to,
    state.schema.text(label, [linkType.create({ href })]),
  );
  tr.setMeta("preventAutolink", true);
  return true;
}

export function applyMarkdownLinkInputRule(
  state: EditorState,
  range: { from: number; to: number },
  match: MarkdownLinkMatch,
): EditorState | null {
  const tr = state.tr;
  if (!applyMarkdownLinkInputToTransaction(state, tr, range, match)) {
    return null;
  }
  return state.apply(tr);
}
