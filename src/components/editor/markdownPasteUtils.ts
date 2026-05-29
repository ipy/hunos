import type { ResolvedPos } from "@tiptap/pm/model";
import {
  isBlockedForTableInput,
  isInLiteralTableOrCodeContext,
  parsePipeTableText,
  type ParsedPipeTable,
} from "./markdownTableUtils";

export type MarkdownPasteAction =
  | { kind: "plain" }
  | { kind: "table"; parsed: ParsedPipeTable }
  | { kind: "markdown" };

/** Decide how plain-text clipboard content should be inserted at the caret. */
export function resolveMarkdownPasteAction(
  text: string,
  $from: ResolvedPos,
): MarkdownPasteAction {
  if (isInLiteralTableOrCodeContext($from)) {
    return { kind: "plain" };
  }

  const parsedTable = parsePipeTableText(text);
  if (parsedTable && !isBlockedForTableInput($from)) {
    return { kind: "table", parsed: parsedTable };
  }

  return { kind: "markdown" };
}
