import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { MarkdownReveal } from './MarkdownReveal';
import { MarkdownPaste } from './MarkdownPaste';
import {
  MarkdownBold,
  MarkdownBulletList,
  MarkdownShortcuts,
  MarkdownTaskItem,
} from './MarkdownShortcuts';
import { WikiLinkDecoration } from './WikiLinkDecoration';
import { WikiLinkSuggestion } from './WikiLinkSuggestion';
import { TagSuggestion } from './TagSuggestion';
import { TagDecoration } from './TagDecoration';
import { SketchResize } from './SketchNodeView';
import { FocusModeShortcuts } from './FocusModeShortcuts';
import { EditorKeyboardShortcuts } from './EditorKeyboardShortcuts';
import { ListOutlineShortcuts } from './ListOutlineShortcuts';
import ListItem from '@tiptap/extension-list-item';
import { SelectionBubbleMenu } from './SelectionBubbleMenu';
import Strike from '@tiptap/extension-strike';
import Italic from '@tiptap/extension-italic';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeContext';
import { resolveTextFontFamily, resolveCodeFontFamily } from '@/utils/fonts';
import { useNoteStore } from '@/store/noteStore';
import { useTagStore } from '@/store/tagStore';
import { noteStorage } from '@/storage/noteStorage';
import { graphEngine } from '@/graph/graphEngine';
import { findNoteByWikiTitle } from '@/utils/wikiLink';
import type { Editor } from '@tiptap/react';
import type { EditorFont } from '@/types/settings';

interface TiptapEditorProps {
  noteId: string;
  initialContent: string;
  onChange: (json: string) => void;
  onEditorReady: (editor: Editor) => void;
  fontFamily: EditorFont;
  headingsFont: EditorFont;
  codeFont: EditorFont;
  fontSize: number;
  lineHeight: number;
  lineWidth: number;
  paragraphSpacing: number;
}

export function TiptapEditor({
  noteId,
  initialContent,
  onChange,
  onEditorReady,
  fontFamily,
  headingsFont,
  codeFont,
  fontSize,
  lineHeight,
  lineWidth,
  paragraphSpacing,
}: TiptapEditorProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const prevNoteIdRef = useRef(noteId);
  const lastExternalContentRef = useRef(initialContent);
  const noteIdRef = useRef(noteId);
  noteIdRef.current = noteId;
  const notesRef = useRef(useNoteStore.getState().notes);
  const tagsRef = useRef(useTagStore.getState().tags);

  useEffect(() => {
    notesRef.current = useNoteStore.getState().notes;
    return useNoteStore.subscribe((state) => {
      notesRef.current = state.notes;
    });
  }, []);

  useEffect(() => {
    tagsRef.current = useTagStore.getState().tags;
    return useTagStore.subscribe((state) => {
      tagsRef.current = state.tags;
    });
  }, []);

  const handleWikiLinkClick = async (title: string) => {
    const store = useNoteStore.getState();
    let target = findNoteByWikiTitle(store.notes, title);

    if (!target) {
      const searchResults = await noteStorage.search(title);
      target = findNoteByWikiTitle(searchResults, title);
    }

    if (target) {
      store.setActiveNote(target.id);
      return;
    }

    await store.createNote(title);
    const sourceNote = await noteStorage.get(noteIdRef.current);
    if (sourceNote?.content) {
      await graphEngine.syncNoteLinks(noteIdRef.current, sourceNote.content);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bold: false,
        bulletList: false,
        strike: false,
        italic: false,
        listItem: false,
      }),
      ListItem.extend({
        addKeyboardShortcuts() {
          return {
            Enter: () => this.editor.commands.splitListItem(this.name),
          };
        },
      }),
      Strike.extend({
        addKeyboardShortcuts() {
          return {};
        },
      }),
      Italic.extend({
        addKeyboardShortcuts() {
          return {};
        },
      }),
      MarkdownBold,
      MarkdownShortcuts,
      MarkdownBulletList,
      Placeholder.configure({
        placeholder: t('editor.placeholder'),
      }),
      TaskList,
      MarkdownTaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'editor-link' },
      }),
      Image.extend({
        addAttributes() {
          return {
            src: { default: null },
            alt: { default: null },
            title: { default: null },
            height: {
              default: null,
              renderHTML: (attrs) => {
                if (!attrs.height) return {};
                return { style: `height: ${attrs.height}px; object-fit: contain;` };
              },
              parseHTML: (el) => {
                const h = el.style.height;
                return h ? parseInt(h, 10) || null : null;
              },
            },
            'data-sketch': {
              default: null,
              renderHTML: (attrs) => {
                if (!attrs['data-sketch']) return {};
                return { 'data-sketch': 'true' };
              },
              parseHTML: (el) => el.getAttribute('data-sketch'),
            },
          };
        },
      }).configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: 'editor-image' },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      MarkdownReveal,
      MarkdownPaste,
      WikiLinkDecoration.configure({ onWikiLinkClick: handleWikiLinkClick }),
      WikiLinkSuggestion.configure({
        getNoteId: () => noteIdRef.current,
        getNotes: () => notesRef.current,
      }),
      TagSuggestion.configure({
        getTags: () => tagsRef.current,
      }),
      TagDecoration,
      SketchResize,
      FocusModeShortcuts,
      EditorKeyboardShortcuts,
      ListOutlineShortcuts,
    ],
    content: initialContent ? tryParseJson(initialContent) : undefined,
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      onChange(json);
    },
    editorProps: {
      attributes: {
        class: 'hunos-editor',
      },
    },
  });

  useEffect(() => {
    if (editor) onEditorReady(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor) return;

    const noteChanged = prevNoteIdRef.current !== noteId;
    const contentChangedExternally =
      !noteChanged && initialContent !== lastExternalContentRef.current;

    if (!noteChanged && !contentChangedExternally) return;

    prevNoteIdRef.current = noteId;
    lastExternalContentRef.current = initialContent;

    if (!initialContent) {
      editor.commands.clearContent(true);
    } else {
      const parsed = tryParseJson(initialContent);
      if (parsed) editor.commands.setContent(parsed, false);
    }

    if (noteChanged) {
      editor.commands.focus('start');
    }
  }, [noteId, editor, initialContent]);

  const textFontCSS = resolveTextFontFamily(fontFamily);
  const headingsFontCSS = resolveTextFontFamily(headingsFont);
  const codeFontCSS = resolveCodeFontFamily(codeFont);

  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    dom.style.fontFamily = textFontCSS;
    dom.style.fontSize = `${fontSize}px`;
    dom.style.lineHeight = `${lineHeight}`;
    dom.style.maxWidth = `${lineWidth}em`;
  }, [editor, textFontCSS, fontSize, lineHeight, lineWidth]);

  const pMargin = paragraphSpacing > 0 ? `${paragraphSpacing}em` : '0.5em';

  return (
    <>
      <style>{`
        .hunos-editor {
          outline: none;
          padding: 20px 24px;
          min-height: 300px;
          color: ${theme.colors.text};
          max-width: ${lineWidth}em;
          margin: 0 auto;
          font-family: ${textFontCSS};
          font-size: ${fontSize}px;
          line-height: ${lineHeight};
        }
        .hunos-editor p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: ${theme.colors.textTertiary};
          pointer-events: none;
          height: 0;
        }
        .hunos-editor h1 { font-family: ${headingsFontCSS}; font-size: 1.75em; font-weight: 700; margin: 0.67em 0 0.3em; line-height: 1.2; }
        .hunos-editor h2 { font-family: ${headingsFontCSS}; font-size: 1.4em; font-weight: 600; margin: 0.6em 0 0.3em; line-height: 1.3; }
        .hunos-editor h3 { font-family: ${headingsFontCSS}; font-size: 1.15em; font-weight: 600; margin: 0.5em 0 0.3em; line-height: 1.3; }
        .hunos-editor p { margin: 0 0 ${pMargin}; }
        .hunos-editor ul, .hunos-editor ol { padding-left: 1.5em; margin: 0.3em 0; }
        .hunos-editor li { margin: 0.15em 0; }
        .hunos-editor li p { margin: 0; }
        .hunos-editor blockquote {
          border-left: 3px solid ${theme.colors.accent};
          padding-left: 1em;
          margin: 0.5em 0;
          color: ${theme.colors.textSecondary};
        }
        .hunos-editor code {
          background: ${theme.colors.surface};
          border-radius: 4px;
          padding: 0.15em 0.4em;
          font-size: 0.88em;
          font-family: ${codeFontCSS};
        }
        .hunos-editor pre {
          background: ${theme.colors.surface};
          border-radius: 8px;
          padding: 14px 16px;
          margin: 0.6em 0;
          overflow-x: auto;
          font-size: 0.88em;
          font-family: ${codeFontCSS};
        }
        .hunos-editor pre code {
          background: none;
          padding: 0;
        }
        .hunos-editor mark {
          background: ${theme.colors.highlight};
          border-radius: 2px;
          padding: 0.05em 0.15em;
        }
        .hunos-editor hr {
          border: none;
          border-top: 1px solid ${theme.colors.border};
          margin: 1.2em 0;
        }
        .hunos-editor ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
        }
        .hunos-editor ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .hunos-editor ul[data-type="taskList"] li label {
          margin-top: 3px;
        }
        .hunos-editor ul[data-type="taskList"] li input[type="checkbox"] {
          width: 16px;
          height: 16px;
          accent-color: ${theme.colors.accent};
          cursor: pointer;
        }
        .hunos-editor .editor-link {
          color: ${theme.colors.accent};
          text-decoration: underline;
          cursor: pointer;
        }
        .hunos-editor a { color: ${theme.colors.accent}; }
        .hunos-editor strong { font-weight: 700; }
        .hunos-editor em { font-style: italic; }
        .hunos-editor .editor-image {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 0.6em 0;
          display: block;
        }
        .hunos-editor img[data-sketch="true"] {
          cursor: pointer;
          border: 1px solid ${theme.colors.borderLight};
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .hunos-editor img[data-sketch="true"]:hover {
          border-color: ${theme.colors.accent};
          box-shadow: 0 0 0 2px ${theme.colors.accentLight};
        }
        .sketch-resize-handle {
          width: 100%;
          height: 12px;
          cursor: ns-resize;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: -6px 0 6px;
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .sketch-resize-handle:hover,
        .sketch-resize-handle:active {
          opacity: 1;
        }
        .sketch-resize-handle::after {
          content: '';
          width: 40px;
          height: 4px;
          border-radius: 2px;
          background: ${theme.colors.textTertiary};
        }
        .hunos-editor img[data-sketch="true"]:hover + .sketch-resize-handle {
          opacity: 1;
        }
        .hunos-editor table {
          border-collapse: collapse;
          width: 100%;
          margin: 0.6em 0;
          overflow: hidden;
          border-radius: 6px;
          border: 1px solid ${theme.colors.border};
        }
        .hunos-editor th, .hunos-editor td {
          border: 1px solid ${theme.colors.border};
          padding: 8px 12px;
          text-align: left;
          min-width: 80px;
          vertical-align: top;
          position: relative;
        }
        .hunos-editor th {
          background: ${theme.colors.surface};
          font-weight: 600;
          font-size: 0.92em;
        }
        .hunos-editor td > p, .hunos-editor th > p { margin: 0; }
        .hunos-editor .selectedCell::after {
          content: '';
          position: absolute;
          inset: 0;
          background: ${theme.colors.accentLight};
          pointer-events: none;
          z-index: 1;
        }
        .hunos-editor .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          background: ${theme.colors.accent};
          cursor: col-resize;
        }
        .md-reveal-symbol {
          color: ${theme.colors.textTertiary};
          font-weight: 400;
          font-style: normal;
          text-decoration: none;
          font-size: 0.85em;
          opacity: 0.7;
          pointer-events: none;
          user-select: none;
        }
        .editor-tag {
          color: ${theme.colors.accent};
          font-weight: 500;
          cursor: default;
        }
        .editor-tag-hash {
          color: ${theme.colors.accent};
          opacity: 0.5;
          font-size: 0.9em;
        }
        .editor-tag-active {
          background: ${theme.colors.accentLight};
          border-radius: 3px;
          padding: 0.05em 0.1em;
        }
        .wiki-link-bracket-visible {
          color: ${theme.colors.textTertiary};
          opacity: 0.6;
          font-size: 0.85em;
        }
        .wiki-link-bracket-hidden {
          font-size: 0;
          overflow: hidden;
          width: 0;
          display: inline;
          color: transparent;
        }
        .wiki-link-content {
          color: ${theme.colors.accent};
          text-decoration: underline;
          text-decoration-style: dotted;
          cursor: pointer;
        }
      `}</style>
      <EditorContent editor={editor} />
      <SelectionBubbleMenu editor={editor} />
    </>
  );
}

function tryParseJson(str: string): object | string | undefined {
  if (!str) return undefined;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
