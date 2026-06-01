import { TAG_EXTRACT_REGEX } from "@/utils/tagPattern";

export interface ExtractedTag {
  name: string;
  position: number;
}

export interface ExtractedWikiLink {
  title: string;
  position: number;
  context: string;
}

export interface ExtractionResult {
  tags: ExtractedTag[];
  wikiLinks: ExtractedWikiLink[];
  plainText: string;
  wordCount: number;
  title: string;
}

export interface GraphHeadingAtOffset {
  offset: number;
  title: string;
}

const BACKLINK_SECTION_SEP = " · ";

/** Section heading immediately before `position` in graph-sync plain text offsets. */
export function sectionHeadingAtOffset(
  headings: GraphHeadingAtOffset[],
  position: number,
): string | null {
  let found: GraphHeadingAtOffset | null = null;
  for (const heading of headings) {
    if (heading.offset <= position) {
      found = heading;
    } else {
      break;
    }
  }
  return found?.title ?? null;
}

/**
 * When duplicate wiki-links share a section, the next line may be a later section
 * heading (e.g. 自由试炼 after the second [[项目文档]] in 标签与链接).
 */
export function trailingSectionAfterWikiLink(
  plainText: string,
  linkPosition: number,
  headings: GraphHeadingAtOffset[],
): string | null {
  const linkEnd = plainText.indexOf("]]", linkPosition);
  if (linkEnd === -1) return null;

  const tailStart = linkEnd + 2;
  const lineBreak = plainText.indexOf("\n", tailStart);
  if (lineBreak === -1) return null;

  if (plainText.slice(tailStart, lineBreak).includes("[[")) return null;

  const nextLineStart = lineBreak + 1;
  const nextLineEnd = plainText.indexOf("\n", nextLineStart);
  const nextLine = plainText.slice(
    nextLineStart,
    nextLineEnd === -1 ? undefined : nextLineEnd,
  );

  return headings.find((h) => h.title === nextLine)?.title ?? null;
}

/** Primary section at link offset, or trailing heading when it disambiguates duplicates. */
export function sectionForWikiLinkAtOffset(
  plainText: string,
  linkPosition: number,
  headings: GraphHeadingAtOffset[],
): string | null {
  return (
    trailingSectionAfterWikiLink(plainText, linkPosition, headings) ??
    sectionHeadingAtOffset(headings, linkPosition)
  );
}

/** Prefix link context with its source section when not already disambiguated. */
export function backlinkContextWithSection(
  context: string,
  section: string | null,
): string {
  if (!section) return context;
  const prefix = `${section}${BACKLINK_SECTION_SEP}`;
  if (context.startsWith(prefix)) return context;
  return `${prefix}${context}`;
}

/** Leading section label before the first context separator, if any. */
export function backlinkPrefixFromContext(context: string): string {
  const sep = context.indexOf(BACKLINK_SECTION_SEP);
  if (sep === -1) return context;
  return context.slice(0, sep);
}

/**
 * When multiple rows share the same section prefix, append source title or an
 * occurrence hint so snippet prefixes stay pairwise distinct.
 */
export function disambiguateBacklinkContexts(
  rows: Array<{ context: string; noteTitle: string }>,
): string[] {
  const prefixes = rows.map((row) => backlinkPrefixFromContext(row.context));
  const prefixGroups = new Map<string, number[]>();
  prefixes.forEach((prefix, index) => {
    const group = prefixGroups.get(prefix) ?? [];
    group.push(index);
    prefixGroups.set(prefix, group);
  });

  const collidingPrefixes = new Set(
    [...prefixGroups.entries()]
      .filter(([, indexes]) => indexes.length > 1)
      .map(([prefix]) => prefix),
  );
  if (collidingPrefixes.size === 0) {
    return rows.map((row) => row.context);
  }

  return rows.map((row, index) => {
    const prefix = prefixes[index]!;
    if (!collidingPrefixes.has(prefix)) return row.context;

    const groupIndexes = prefixGroups.get(prefix)!;
    const idxInGroup = groupIndexes.indexOf(index);
    const sourceTitles = new Set(
      groupIndexes.map((groupIndex) => rows[groupIndex]!.noteTitle.trim()),
    );
    const hint =
      sourceTitles.size > 1
        ? row.noteTitle.trim() || `link ${idxInGroup + 1}`
        : `#${idxInGroup + 1}`;
    const disambiguatedPrefix = `${prefix}${BACKLINK_SECTION_SEP}${hint}`;

    if (row.context.startsWith(`${prefix}${BACKLINK_SECTION_SEP}`)) {
      const rest = row.context.slice(
        prefix.length + BACKLINK_SECTION_SEP.length,
      );
      return `${disambiguatedPrefix}${BACKLINK_SECTION_SEP}${rest}`;
    }
    return `${disambiguatedPrefix}${BACKLINK_SECTION_SEP}${row.context}`;
  });
}

function extractContext(
  text: string,
  position: number,
  radius: number = 50,
): string {
  const start = Math.max(0, position - radius);
  const end = Math.min(text.length, position + radius);
  let ctx = text.slice(start, end).trim();
  if (start > 0) ctx = "..." + ctx;
  if (end < text.length) ctx = ctx + "...";
  return ctx;
}

export function extractFromPlainText(text: string): ExtractionResult {
  const tags: ExtractedTag[] = [];
  const wikiLinks: ExtractedWikiLink[] = [];

  TAG_EXTRACT_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_EXTRACT_REGEX.exec(text)) !== null) {
    tags.push({
      name: match[1],
      position: match.index,
    });
  }

  const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
  while ((match = wikiLinkRegex.exec(text)) !== null) {
    wikiLinks.push({
      title: match[1].trim(),
      position: match.index,
      context: extractContext(text, match.index),
    });
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines = text.split("\n");
  const title = lines[0]?.replace(/^#+\s*/, "").trim() || "";

  return {
    tags,
    wikiLinks,
    plainText: text,
    wordCount: words.length,
    title: title || "Untitled",
  };
}

function isWikiLinkMark(marks: unknown[] | undefined): boolean {
  if (!Array.isArray(marks)) return false;
  return marks.some((mark) => (mark as { type?: string }).type === "wikiLink");
}

/** Plain text for one TipTap text node; wiki-link marks and [[title]] literals are omitted from search body. */
export function plainTextFromTiptapTextNode(
  text: string,
  marks?: unknown[],
): string {
  if (isWikiLinkMark(marks)) {
    return " ";
  }
  return text.replace(/\[\[[^\]]+\]\]/g, " ");
}

function graphPlainTextFromNode(
  json: unknown,
  onHeading?: (offset: number, title: string) => void,
  offsetRef: { value: number } = { value: 0 },
): string {
  if (!json || typeof json !== "object") return "";

  const doc = json as {
    type?: string;
    content?: unknown[];
    text?: string;
    marks?: unknown[];
  };

  const appendText = (chunk: string): string => {
    offsetRef.value += chunk.length;
    return chunk;
  };

  if (doc.type === "text" && doc.text) {
    if (isWikiLinkMark(doc.marks)) {
      const title = (doc.marks ?? []).find(
        (mark) => (mark as { type?: string }).type === "wikiLink",
      ) as { attrs?: { title?: string } } | undefined;
      return appendText(title?.attrs?.title ? `[[${title.attrs.title}]]` : " ");
    }
    return appendText(doc.text);
  }

  if (!Array.isArray(doc.content)) return "";

  if (doc.type === "heading") {
    const headingStart = offsetRef.value;
    const childRef = { value: headingStart };
    const headingText = doc.content
      .map((node) => graphPlainTextFromNode(node, onHeading, childRef))
      .join("")
      .trim();
    if (headingText) {
      onHeading?.(headingStart, headingText);
    }
    const output = headingText + "\n";
    offsetRef.value = headingStart + output.length;
    return output;
  }

  return doc.content
    .map((node: unknown) => {
      const n = node as {
        type?: string;
        content?: unknown[];
        text?: string;
        marks?: unknown[];
      };
      if (n.type === "text") {
        if (isWikiLinkMark(n.marks)) {
          const title = (n.marks ?? []).find(
            (mark) => (mark as { type?: string }).type === "wikiLink",
          ) as { attrs?: { title?: string } } | undefined;
          return appendText(
            title?.attrs?.title ? `[[${title.attrs.title}]]` : " ",
          );
        }
        return appendText(n.text || "");
      }
      if (n.type === "paragraph") {
        return (
          graphPlainTextFromNode(n, onHeading, offsetRef) + appendText("\n")
        );
      }
      if (n.type === "heading") {
        return graphPlainTextFromNode(n, onHeading, offsetRef);
      }
      if (
        n.type === "taskItem" ||
        n.type === "listItem" ||
        n.type === "blockquote"
      ) {
        return (
          graphPlainTextFromNode(n, onHeading, offsetRef) + appendText("\n")
        );
      }
      if (
        n.type === "bulletList" ||
        n.type === "orderedList" ||
        n.type === "taskList"
      ) {
        return graphPlainTextFromNode(n, onHeading, offsetRef);
      }
      if (n.type === "codeBlock") {
        return (
          graphPlainTextFromNode(n, onHeading, offsetRef) + appendText("\n")
        );
      }
      if (n.type === "table") {
        return (
          graphPlainTextFromNode(n, onHeading, offsetRef) + appendText("\n")
        );
      }
      if (n.type === "tableRow") {
        const rowStart = offsetRef.value;
        const childRef = { value: rowStart };
        const rowText = graphPlainTextFromNode(n, onHeading, childRef).trim();
        const output = rowText ? rowText + "\n" : "";
        offsetRef.value = rowStart + output.length;
        return output;
      }
      if (n.type === "tableCell" || n.type === "tableHeader") {
        return (
          graphPlainTextFromNode(n, onHeading, offsetRef) + appendText("\t")
        );
      }
      return graphPlainTextFromNode(n, onHeading, offsetRef);
    })
    .join("");
}

/** Heading offsets aligned with {@link extractPlainTextForGraphSync} character positions. */
export function graphHeadingOffsetsFromJson(
  json: unknown,
): GraphHeadingAtOffset[] {
  const headings: GraphHeadingAtOffset[] = [];
  graphPlainTextFromNode(json, (offset, title) => {
    headings.push({ offset, title });
  });
  return headings;
}

/** Plain text for graph link extraction — keeps [[title]] literals for wiki-link indexing. */
export function extractPlainTextForGraphSync(json: unknown): string {
  return graphPlainTextFromNode(json);
}

export function extractPlainTextFromTiptap(json: unknown): string {
  if (!json || typeof json !== "object") return "";

  const doc = json as {
    type?: string;
    content?: unknown[];
    text?: string;
    marks?: unknown[];
  };
  if (doc.type === "text" && doc.text) {
    return plainTextFromTiptapTextNode(doc.text, doc.marks);
  }

  if (!Array.isArray(doc.content)) return "";

  return doc.content
    .map((node: unknown) => {
      const n = node as {
        type?: string;
        content?: unknown[];
        text?: string;
        marks?: unknown[];
      };
      if (n.type === "text") {
        return plainTextFromTiptapTextNode(n.text || "", n.marks);
      }
      if (n.type === "paragraph" || n.type === "heading") {
        return extractPlainTextFromTiptap(n) + "\n";
      }
      if (
        n.type === "taskItem" ||
        n.type === "listItem" ||
        n.type === "blockquote"
      ) {
        return extractPlainTextFromTiptap(n) + "\n";
      }
      if (
        n.type === "bulletList" ||
        n.type === "orderedList" ||
        n.type === "taskList"
      ) {
        return extractPlainTextFromTiptap(n);
      }
      if (n.type === "codeBlock") {
        return extractPlainTextFromTiptap(n) + "\n";
      }
      if (n.type === "table") {
        return extractPlainTextFromTiptap(n) + "\n";
      }
      if (n.type === "tableRow") {
        const rowText = extractPlainTextFromTiptap(n).trim();
        return rowText ? rowText + "\n" : "";
      }
      if (n.type === "tableCell" || n.type === "tableHeader") {
        return extractPlainTextFromTiptap(n) + "\t";
      }
      return extractPlainTextFromTiptap(n);
    })
    .join("");
}
