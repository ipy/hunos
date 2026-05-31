/**
 * Readable backlink context for the footer panel — strips markdown syntax
 * while keeping surrounding plain text (including CJK).
 */
export function formatBacklinkSnippet(context: string): string {
  let text = context;

  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  text = text.replace(/\[\[([^\]]+)\]\]/g, "$1");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1");
  text = text.replace(/(?<!_)_([^_]+)_(?!_)/g, "$1");
  text = text.replace(/~~([^~]+)~~/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/==([^=]+)==/g, "$1");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(
    /(^|\s)#([a-zA-Z\u4e00-\u9fff][\w\u4e00-\u9fff/-]*)/g,
    "$1$2",
  );
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/** Raw markdown tokens that must not appear in formatted backlink snippets. */
export const BACKLINK_SNIPPET_RAW_MARKDOWN_RE =
  /\*\*|__|~~|==|\[\[|\]\]|!\[|\]\(|`[^`]+`/;

/** True when text still contains markdown syntax rather than plain prose. */
export function backlinkSnippetHasRawMarkdown(text: string): boolean {
  return BACKLINK_SNIPPET_RAW_MARKDOWN_RE.test(text);
}
