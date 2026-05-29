import type { ResolvedPos } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';
import type { Tag } from '@/types/graph';
import { isValidTagName, TAG_NAME_BODY, TAG_NAME_START } from '@/utils/tagPattern';
import { isInCodeContext } from './wikiLinkSuggestionUtils';

const TAG_QUERY = `${TAG_NAME_START}${TAG_NAME_BODY}`;

export const TAG_SUGGESTION_TRIGGER_REGEX = new RegExp(
  `(?:^|\\s)#(${TAG_QUERY})?$`,
);

export interface TagSuggestionMatch {
  range: { from: number; to: number };
  query: string;
}

function isMarkdownHeadingTrigger(textBefore: string, hashIndex: number): boolean {
  const lineStart = textBefore.lastIndexOf('\n') + 1;
  const beforeHash = textBefore.slice(lineStart, hashIndex);
  if (beforeHash.trim() !== '') return false;

  const afterHash = textBefore.slice(hashIndex + 1);
  if (afterHash.startsWith(' ')) return true;
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

  const hashIndex = textBefore.lastIndexOf('#');
  if (isMarkdownHeadingTrigger(textBefore, hashIndex)) return null;

  return {
    range: { from: hashIndex, to: offset },
    query: match[1] ?? '',
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
  const textBefore = state.doc.textBetween(blockStart, $from.pos, '\n', '\n');
  const localMatch = findTagSuggestionMatchInBlock(textBefore, textBefore.length);
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

  const validTags = tags.filter(t => isValidTagName(t.name));

  const matching = q
    ? validTags.filter(t => t.name.toLowerCase().includes(q))
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
