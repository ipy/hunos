import type { ResolvedPos } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";
import type { Tag } from "@/types/graph";
import {
  isValidTagName,
  TAG_DECORATION_REGEX,
  TAG_NAME_BODY,
  TAG_NAME_START,
} from "@/utils/tagPattern";
import { isInCodeContext } from "./wikiLinkSuggestionUtils";

const TAG_QUERY = `${TAG_NAME_START}${TAG_NAME_BODY}`;

export const TAG_SUGGESTION_TRIGGER_REGEX = new RegExp(
  `(?:^|\\s)#(${TAG_QUERY})?$`,
);

export interface TagSuggestionMatch {
  range: { from: number; to: number };
  query: string;
}

export interface TagSpan {
  start: number;
  end: number;
  name: string;
}

export function findCompleteTagsInBlock(blockText: string): TagSpan[] {
  const spans: TagSpan[] = [];
  TAG_DECORATION_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_DECORATION_REGEX.exec(blockText)) !== null) {
    const fullMatch = match[0];
    const hashOffset = fullMatch.indexOf("#");
    const start = match.index + hashOffset;
    spans.push({
      start,
      end: start + 1 + match[1].length,
      name: match[1],
    });
  }
  return spans;
}

function findCompleteTagContainingOffset(
  blockText: string,
  offset: number,
): TagSpan | null {
  for (const span of findCompleteTagsInBlock(blockText)) {
    if (offset >= span.start && offset <= span.end) {
      return span;
    }
  }
  return null;
}

function isMarkdownHeadingTrigger(
  textBefore: string,
  hashIndex: number,
): boolean {
  const lineStart = textBefore.lastIndexOf("\n") + 1;
  const beforeHash = textBefore.slice(lineStart, hashIndex);
  if (beforeHash.trim() !== "") return false;

  const afterHash = textBefore.slice(hashIndex + 1);
  if (afterHash.startsWith(" ")) return true;
  if (/^#{1,2}(?:\s|$)/.test(afterHash)) return true;
  return false;
}

export function findTagSuggestionMatchInBlock(
  blockText: string,
  offset: number,
): TagSuggestionMatch | null {
  if (offset < 0 || offset > blockText.length) return null;

  const textBefore = blockText.slice(0, offset);
  const match = TAG_SUGGESTION_TRIGGER_REGEX.exec(textBefore);
  if (!match) return null;

  const hashIndex = textBefore.lastIndexOf("#");
  if (isMarkdownHeadingTrigger(textBefore, hashIndex)) return null;

  let rangeTo = offset;
  let query = match[1] ?? "";

  const completeTag = findCompleteTagContainingOffset(blockText, offset);
  if (completeTag && completeTag.start === hashIndex) {
    rangeTo = completeTag.end;
    query = completeTag.name;
  }

  return {
    range: { from: hashIndex, to: rangeTo },
    query,
  };
}

export function findTagSuggestionMatch(
  state: EditorState,
): TagSuggestionMatch | null {
  const { selection } = state;
  if (!selection.empty) return null;

  const $from = selection.$from;
  if (isInCodeContext($from)) return null;

  const blockStart = $from.start();
  const blockEnd = $from.end();
  const blockText = state.doc.textBetween(blockStart, blockEnd, "\n", "\n");
  const caretOffset = $from.pos - blockStart;
  const localMatch = findTagSuggestionMatchInBlock(blockText, caretOffset);
  if (!localMatch) return null;

  return {
    range: {
      from: blockStart + localMatch.range.from,
      to: blockStart + localMatch.range.to,
    },
    query: localMatch.query,
  };
}

export function filterTagCandidates(
  tags: Tag[],
  query: string,
  limit = 8,
): Tag[] {
  const q = query.toLowerCase().trim();

  const validTags = tags.filter((t) => isValidTagName(t.name));

  const matching = q
    ? validTags.filter((t) => t.name.toLowerCase().includes(q))
    : validTags;

  matching.sort((a, b) => {
    if (!q) return a.name.localeCompare(b.name);
    const aPrefix = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bPrefix = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    if (aPrefix !== bPrefix) return aPrefix - bPrefix;
    return a.name.localeCompare(b.name);
  });

  return matching.slice(0, limit);
}
