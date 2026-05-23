import type { Note } from '@/types/note';

function tiptapToMarkdown(json: unknown): string {
  if (!json || typeof json !== 'object') return '';
  const doc = json as { type?: string; content?: unknown[]; text?: string; attrs?: Record<string, unknown>; marks?: { type: string }[] };

  if (doc.type === 'text') {
    let text = doc.text || '';
    if (doc.marks) {
      for (const mark of doc.marks) {
        switch (mark.type) {
          case 'bold': text = `**${text}**`; break;
          case 'italic': text = `*${text}*`; break;
          case 'strike': text = `~~${text}~~`; break;
          case 'underline': text = `<u>${text}</u>`; break;
          case 'highlight': text = `==${text}==`; break;
          case 'code': text = `\`${text}\``; break;
        }
      }
    }
    return text;
  }

  const children = (doc.content || []).map((c: unknown) => tiptapToMarkdown(c)).join('');

  switch (doc.type) {
    case 'doc': return children;
    case 'paragraph': return children + '\n\n';
    case 'heading': {
      const level = (doc.attrs?.level as number) || 1;
      return '#'.repeat(level) + ' ' + children + '\n\n';
    }
    case 'bulletList': return children;
    case 'orderedList': return children;
    case 'listItem': return '- ' + children.trim() + '\n';
    case 'taskList': return children;
    case 'taskItem': {
      const checked = doc.attrs?.checked ? 'x' : ' ';
      return `- [${checked}] ` + children.trim() + '\n';
    }
    case 'blockquote': return '> ' + children.trim().replace(/\n/g, '\n> ') + '\n\n';
    case 'codeBlock': return '```\n' + children + '```\n\n';
    case 'horizontalRule': return '---\n\n';
    default: return children;
  }
}

function tiptapToHtml(json: unknown): string {
  if (!json || typeof json !== 'object') return '';
  const doc = json as { type?: string; content?: unknown[]; text?: string; attrs?: Record<string, unknown>; marks?: { type: string }[] };

  if (doc.type === 'text') {
    let text = escapeHtml(doc.text || '');
    if (doc.marks) {
      for (const mark of doc.marks) {
        switch (mark.type) {
          case 'bold': text = `<strong>${text}</strong>`; break;
          case 'italic': text = `<em>${text}</em>`; break;
          case 'strike': text = `<del>${text}</del>`; break;
          case 'underline': text = `<u>${text}</u>`; break;
          case 'highlight': text = `<mark>${text}</mark>`; break;
          case 'code': text = `<code>${text}</code>`; break;
        }
      }
    }
    return text;
  }

  const children = (doc.content || []).map((c: unknown) => tiptapToHtml(c)).join('');

  switch (doc.type) {
    case 'doc': return children;
    case 'paragraph': return `<p>${children}</p>`;
    case 'heading': {
      const level = (doc.attrs?.level as number) || 1;
      return `<h${level}>${children}</h${level}>`;
    }
    case 'bulletList': return `<ul>${children}</ul>`;
    case 'orderedList': return `<ol>${children}</ol>`;
    case 'listItem': return `<li>${children}</li>`;
    case 'taskList': return `<ul class="task-list">${children}</ul>`;
    case 'taskItem': {
      const checked = doc.attrs?.checked ? ' checked' : '';
      return `<li><input type="checkbox"${checked} disabled> ${children}</li>`;
    }
    case 'blockquote': return `<blockquote>${children}</blockquote>`;
    case 'codeBlock': return `<pre><code>${children}</code></pre>`;
    case 'horizontalRule': return '<hr>';
    default: return children;
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function exportNote(note: Note, format: 'markdown' | 'html' | 'text'): string {
  if (format === 'text') return note.contentPlain;

  try {
    const json = JSON.parse(note.content);
    if (format === 'markdown') return tiptapToMarkdown(json).trim();
    if (format === 'html') {
      return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(note.title)}</title>
<style>body{font-family:-apple-system,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;line-height:1.7}
mark{background:#fff3cd}code{background:#f4f4f4;padding:2px 6px;border-radius:4px}
pre{background:#f4f4f4;padding:16px;border-radius:8px;overflow-x:auto}</style>
</head><body>${tiptapToHtml(json)}</body></html>`;
    }
  } catch {
    return note.contentPlain;
  }
  return note.contentPlain;
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAndDownload(note: Note, format: 'markdown' | 'html' | 'text') {
  const content = exportNote(note, format);
  const title = note.title || 'untitled';
  const ext = format === 'markdown' ? 'md' : format === 'html' ? 'html' : 'txt';
  const mime = format === 'html' ? 'text/html' : 'text/plain';
  downloadFile(content, `${title}.${ext}`, mime);
}
