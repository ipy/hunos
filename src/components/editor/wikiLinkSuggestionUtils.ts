import type { ResolvedPos } from '@tiptap/pm/model';
import type { EditorState } from '@tiptap/pm/state';
import type { Note } from '@/types/note';

export const WIKI_LINK_TRIGGER_REGEX = /\[\[([^\]]*)$/;
export const WIKI_LINK_COMPLETE_REGEX = /\[\[([^\]]+)\]\]/g;

export interface WikiLinkSuggestionMatch {
  range: { from: number; to: number };
  query: string;
}

export function isInCodeContext($from: ResolvedPos): boolean {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === 'codeBlock') {
      return true;
    }
  }
  return $from.marks().some(m => m.type.name === 'code');
}

/** True when pos lies inside a closed `[[title]]` span (not while composing a new link). */
export function isInsideCompleteWikiLink(state: EditorState, pos: number): boolean {
  const $pos = state.doc.resolve(pos);
  if (isInCodeContext($pos)) return false;

  const blockStart = $pos.start();
  const blockEnd = $pos.end();
  const blockText = state.doc.textBetween(blockStart, blockEnd, '\n', '\n');
  const offset = pos - blockStart;

  WIKI_LINK_COMPLETE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WIKI_LINK_COMPLETE_REGEX.exec(blockText)) !== null) {
    const linkStart = match.index;
    const linkEnd = match.index + match[0].length;
    if (offset > linkStart && offset < linkEnd) {
      return true;
    }
  }
  return false;
}

export function findWikiLinkSuggestionMatch(
  state: EditorState,
): WikiLinkSuggestionMatch | null {
  const { selection } = state;
  if (!selection.empty) return null;

  const $from = selection.$from;
  if (isInCodeContext($from)) return null;
  if (isInsideCompleteWikiLink(state, $from.pos)) return null;

  const blockStart = $from.start();
  const textBefore = state.doc.textBetween(blockStart, $from.pos, '\n', '\n');
  const match = WIKI_LINK_TRIGGER_REGEX.exec(textBefore);
  if (!match) return null;

  const triggerLen = match[0].length;
  return {
    range: { from: $from.pos - triggerLen, to: $from.pos },
    query: match[1],
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
    n =>
      n.status === 'active'
      && n.id !== currentNoteId
      && n.title.toLowerCase().includes(q),
  );

  matching.sort((a, b) => {
    const aPrefix = a.title.toLowerCase().startsWith(q) ? 0 : 1;
    const bPrefix = b.title.toLowerCase().startsWith(q) ? 0 : 1;
    if (aPrefix !== bPrefix) return aPrefix - bPrefix;
    return b.modifiedAt - a.modifiedAt;
  });

  return matching.slice(0, limit);
}
