import type { Note } from "@/types/note";

function tiptapToMarkdown(
  json: unknown,
  context?: { orderedIndex?: number; inOrderedList?: boolean },
): string {
  if (!json || typeof json !== "object") return "";
  const doc = json as {
    type?: string;
    content?: unknown[];
    text?: string;
    attrs?: Record<string, unknown>;
    marks?: { type: string; attrs?: Record<string, unknown> }[];
  };

  if (doc.type === "text") {
    let text = doc.text || "";
    if (doc.marks) {
      for (const mark of doc.marks) {
        switch (mark.type) {
          case "bold":
            text = `**${text}**`;
            break;
          case "italic":
            text = `*${text}*`;
            break;
          case "strike":
            text = `~~${text}~~`;
            break;
          case "underline":
            text = `<u>${text}</u>`;
            break;
          case "highlight":
            text = `==${text}==`;
            break;
          case "code":
            text = `\`${text}\``;
            break;
          case "link": {
            const href = (mark.attrs?.href as string) || "";
            text = `[${text}](${href})`;
            break;
          }
        }
      }
    }
    return text;
  }

  const childContext = { ...context };
  let children = "";

  if (doc.type === "orderedList" && Array.isArray(doc.content)) {
    children = doc.content
      .map((item, index) =>
        tiptapToMarkdown(item, {
          inOrderedList: true,
          orderedIndex: index + 1,
        }),
      )
      .join("");
  } else if (Array.isArray(doc.content)) {
    children = doc.content
      .map((c: unknown) => tiptapToMarkdown(c, childContext))
      .join("");
  }

  switch (doc.type) {
    case "doc":
      return children;
    case "paragraph":
      return children + "\n\n";
    case "heading": {
      const level = (doc.attrs?.level as number) || 1;
      return "#".repeat(level) + " " + children.trim() + "\n\n";
    }
    case "bulletList":
      return children + "\n";
    case "orderedList":
      return children + "\n";
    case "listItem": {
      const prefix = context?.inOrderedList
        ? `${context.orderedIndex ?? 1}. `
        : "- ";
      return prefix + children.trim() + "\n";
    }
    case "taskList":
      return children + "\n";
    case "taskItem": {
      const checked = doc.attrs?.checked ? "x" : " ";
      return `- [${checked}] ` + children.trim() + "\n";
    }
    case "blockquote":
      return "> " + children.trim().replace(/\n/g, "\n> ") + "\n\n";
    case "codeBlock": {
      const language = doc.attrs?.language as string | undefined;
      const fence = language ? `\`\`\`${language}\n` : "```\n";
      return fence + children + "```\n\n";
    }
    case "horizontalRule":
      return "---\n\n";
    case "image": {
      const src = (doc.attrs?.src as string) || "";
      const alt = (doc.attrs?.alt as string) || "";
      return `![${alt}](${src})\n\n`;
    }
    case "table": {
      const rows = (doc.content || []).map((c: unknown) =>
        tiptapToMarkdown(c, childContext).trimEnd(),
      );
      if (rows.length === 0) return "";
      const colCount = rows[0].split("|").filter((c) => c.trim()).length;
      const separator = "| " + Array(colCount).fill("---").join(" | ") + " |\n";
      return rows[0] + "\n" + separator + rows.slice(1).join("\n") + "\n\n";
    }
    case "tableRow": {
      const cells = (doc.content || []).map((c: unknown) =>
        tiptapToMarkdown(c, childContext).trim(),
      );
      return "| " + cells.join(" | ") + " |\n";
    }
    case "tableHeader":
    case "tableCell":
      return children;
    default:
      return children;
  }
}

function tiptapToHtml(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const doc = json as {
    type?: string;
    content?: unknown[];
    text?: string;
    attrs?: Record<string, unknown>;
    marks?: { type: string; attrs?: Record<string, unknown> }[];
  };

  if (doc.type === "text") {
    let text = escapeHtml(doc.text || "");
    if (doc.marks) {
      for (const mark of doc.marks) {
        switch (mark.type) {
          case "bold":
            text = `<strong>${text}</strong>`;
            break;
          case "italic":
            text = `<em>${text}</em>`;
            break;
          case "strike":
            text = `<del>${text}</del>`;
            break;
          case "underline":
            text = `<u>${text}</u>`;
            break;
          case "highlight":
            text = `<mark>${text}</mark>`;
            break;
          case "code":
            text = `<code>${text}</code>`;
            break;
          case "link": {
            const href = escapeHtml((mark.attrs?.href as string) || "");
            text = `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
            break;
          }
        }
      }
    }
    return text;
  }

  const children = (doc.content || [])
    .map((c: unknown) => tiptapToHtml(c))
    .join("");

  switch (doc.type) {
    case "doc":
      return children;
    case "paragraph":
      return `<p>${children}</p>`;
    case "heading": {
      const level = (doc.attrs?.level as number) || 1;
      return `<h${level}>${children}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${children}</ul>`;
    case "orderedList":
      return `<ol>${children}</ol>`;
    case "listItem":
      return `<li>${children}</li>`;
    case "taskList":
      return `<ul class="task-list">${children}</ul>`;
    case "taskItem": {
      const checked = Boolean(doc.attrs?.checked);
      const checkedAttr = checked ? " checked" : "";
      const dataChecked = checked ? ' data-checked="true"' : "";
      const label = checked
        ? `<del class="task-done">${children}</del>`
        : children;
      return `<li${dataChecked}><input type="checkbox"${checkedAttr} disabled> ${label}</li>`;
    }
    case "blockquote":
      return `<blockquote>${children}</blockquote>`;
    case "codeBlock": {
      const language = doc.attrs?.language as string | undefined;
      const langClass = language ? ` class="language-${language}"` : "";
      return `<pre><code${langClass}>${children}</code></pre>`;
    }
    case "horizontalRule":
      return "<hr>";
    case "image": {
      const src = escapeHtml((doc.attrs?.src as string) || "");
      const alt = escapeHtml((doc.attrs?.alt as string) || "");
      return `<img src="${src}" alt="${alt}" class="editor-image" />`;
    }
    default:
      return children;
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function exportNote(
  note: Note,
  format: "markdown" | "html" | "text",
): string {
  if (format === "text") return note.contentPlain ?? "";

  try {
    const json = JSON.parse(note.content);
    if (format === "markdown") return tiptapToMarkdown(json).trim();
    if (format === "html") {
      return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(note.title)}</title>
<style>body{font-family:-apple-system,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;line-height:1.7}
mark{background:#fff3cd}code{background:#f4f4f4;padding:2px 6px;border-radius:4px}
pre{background:#f4f4f4;padding:16px;border-radius:8px;overflow-x:auto}
ul.task-list{list-style:none;padding-left:0}
ul.task-list li[data-checked="true"] del.task-done{color:#AEAEB2;text-decoration:line-through}
ul.task-list li[data-checked="true"] del.task-done a{color:#AEAEB2}</style>
</head><body>${tiptapToHtml(json)}</body></html>`;
    }
  } catch {
    return note.contentPlain ?? "";
  }
  return note.contentPlain ?? "";
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAndDownload(
  note: Note,
  format: "markdown" | "html" | "text",
) {
  const content = exportNote(note, format);
  const title = note.title || "untitled";
  const ext = format === "markdown" ? "md" : format === "html" ? "html" : "txt";
  const mime = format === "html" ? "text/html" : "text/plain";
  downloadFile(content, `${title}.${ext}`, mime);
}
