import type { ResolvedPos } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";
import type { Note } from "@/types/note";
import { isWikiLinkSuggestionSuppressed } from "./wikiLinkEditGuard";

export const WIKI_LINK_TRIGGER_REGEX = /\[\[([^\]]*)$/;
export const WIKI_LINK_COMPLETE_REGEX = /\[\[([^\]]+)\]\]/g;

export interface WikiLinkSpan {
  start: number;
  end: number;
  title: string;
}

export interface WikiLinkSuggestionMatch {
  range: { from: number; to: number };
  query: string;
}

export function findCompleteWikiLinksInBlock(
  blockText: string,
): WikiLinkSpan[] {
  const spans: WikiLinkSpan[] = [];
  WIKI_LINK_COMPLETE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WIKI_LINK_COMPLETE_REGEX.exec(blockText)) !== null) {
    spans.push({
      start: match.index,
      end: match.index + match[0].length,
      title: match[1],
    });
  }
  return spans;
}

export function isInCodeContext($from: ResolvedPos): boolean {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === "codeBlock") {
      return true;
    }
  }
  return $from.marks().some((m) => m.type.name === "code");
}

export function isOffsetInsideCompleteWikiLink(
  blockText: string,
  offset: number,
  options?: { inclusive?: boolean },
): boolean {
  const inclusive = options?.inclusive ?? true;
  for (const span of findCompleteWikiLinksInBlock(blockText)) {
    if (inclusive) {
      if (offset >= span.start && offset <= span.end) return true;
    } else if (offset > span.start && offset < span.end) {
      return true;
    }
  }
  return false;
}

export function doesRangeIntersectWikiLinkInBlock(
  blockText: string,
  fromOffset: number,
  toOffset: number,
): boolean {
  for (const span of findCompleteWikiLinksInBlock(blockText)) {
    if (toOffset > span.start && fromOffset < span.end) {
      return true;
    }
  }
  return false;
}

export function isComposePrefixOfExistingLink(
  blockText: string,
  composeStart: number,
  composeEnd: number,
): boolean {
  for (const span of findCompleteWikiLinksInBlock(blockText)) {
    if (span.start === composeStart && composeEnd < span.end) {
      return true;
    }
  }
  return false;
}

/** True when pos lies inside a closed `[[title]]` span (not while composing a new link). */
export function isPosInsideCompleteWikiLink(
  state: EditorState,
  pos: number,
  options?: { inclusive?: boolean },
): boolean {
  const $pos = state.doc.resolve(pos);
  if (isInCodeContext($pos)) return false;

  const blockStart = $pos.start();
  const blockEnd = $pos.end();
  const blockText = state.doc.textBetween(blockStart, blockEnd, "\n", "\n");
  const offset = pos - blockStart;
  return isOffsetInsideCompleteWikiLink(blockText, offset, options);
}

export function isRangeIntersectingWikiLink(
  state: EditorState,
  from: number,
  to: number,
): boolean {
  const $from = state.doc.resolve(from);
  const blockStart = $from.start();
  const blockEnd = $from.end();
  const blockText = state.doc.textBetween(blockStart, blockEnd, "\n", "\n");
  return doesRangeIntersectWikiLinkInBlock(
    blockText,
    from - blockStart,
    to - blockStart,
  );
}

/** Block-local suggestion match for unit tests (offsets are relative to block start). */
export function findWikiLinkSuggestionMatchInBlock(
  blockText: string,
  caretOffset: number,
):
  | (Omit<WikiLinkSuggestionMatch, "range"> & {
      range: { from: number; to: number };
    })
  | null {
  if (isOffsetInsideCompleteWikiLink(blockText, caretOffset)) return null;

  const textBefore = blockText.slice(0, caretOffset);
  const match = WIKI_LINK_TRIGGER_REGEX.exec(textBefore);
  if (!match) return null;

  const triggerLen = match[0].length;
  const fromOffset = caretOffset - triggerLen;

  if (doesRangeIntersectWikiLinkInBlock(blockText, fromOffset, caretOffset)) {
    return null;
  }
  if (isComposePrefixOfExistingLink(blockText, fromOffset, caretOffset)) {
    return null;
  }

  return {
    range: { from: fromOffset, to: caretOffset },
    query: match[1],
  };
}

export function findWikiLinkSuggestionMatch(
  state: EditorState,
): WikiLinkSuggestionMatch | null {
  if (isWikiLinkSuggestionSuppressed()) return null;

  const { selection } = state;
  if (!selection.empty) return null;

  const $from = selection.$from;
  if (isInCodeContext($from)) return null;

  const blockStart = $from.start();
  const blockEnd = $from.end();
  const blockText = state.doc.textBetween(blockStart, blockEnd, "\n", "\n");
  const caretOffset = $from.pos - blockStart;

  const blockMatch = findWikiLinkSuggestionMatchInBlock(blockText, caretOffset);
  if (!blockMatch) return null;

  return {
    range: {
      from: blockStart + blockMatch.range.from,
      to: blockStart + blockMatch.range.to,
    },
    query: blockMatch.query,
  };
}

export function filterWikiLinkCandidates(
  notes: Note[],
  query: string,
  currentNoteId: string,
  limit = 8,
): Note[] {
  const q = query.toLowerCase().trim();
  const matching = notes.filter(
    (n) =>
      n.status === "active" &&
      n.id !== currentNoteId &&
      n.title.toLowerCase().includes(q),
  );

  matching.sort((a, b) => {
    const aPrefix = a.title.toLowerCase().startsWith(q) ? 0 : 1;
    const bPrefix = b.title.toLowerCase().startsWith(q) ? 0 : 1;
    if (aPrefix !== bPrefix) return aPrefix - bPrefix;
    return b.modifiedAt - a.modifiedAt;
  });

  return matching.slice(0, limit);
}
