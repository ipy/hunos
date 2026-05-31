import React, { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { HunosTable } from "./HunosTable";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { MarkdownReveal } from "./MarkdownReveal";
import { MarkdownPaste } from "./MarkdownPaste";
import { ImagePasteDrop } from "./ImagePasteDrop";
import {
  MarkdownBold,
  MarkdownBulletList,
  MarkdownCode,
  MarkdownHighlight,
  MarkdownItalic,
  MarkdownShortcuts,
  MarkdownStrike,
  MarkdownTaskItem,
} from "./MarkdownShortcuts";
import { MarkdownStarDebrisCleanup } from "./MarkdownStarDebrisCleanup";
import { DocumentEndKeyboardShortcuts } from "./DocumentEndKeyboardShortcuts";
import { TASK_LIST_TOGGLE_REORDER_META } from "./taskSinkUtils";
import { applyHideCompletedTasksDomAttribute } from "@/utils/hideCompletedTasksDom";
import { registerWikiLinkActivator } from "@/testing/hunos-e2e-bridge";
import {
  WikiLinkDecoration,
  activateWikiLinkByTitle,
} from "./WikiLinkDecoration";
import { WikiLinkSuggestion } from "./WikiLinkSuggestion";
import { TagSuggestion } from "./TagSuggestion";
import { TagDecoration } from "./TagDecoration";
import { SketchResize } from "./SketchNodeView";
import { FocusModeShortcuts } from "./FocusModeShortcuts";
import { EditorKeyboardShortcuts } from "./EditorKeyboardShortcuts";
import { ListOutlineShortcuts } from "./ListOutlineShortcuts";
import { HeadingListBoundaryShortcuts } from "./HeadingListBoundaryShortcuts";
import { ListKeyboardShortcuts } from "./ListKeyboardShortcuts";
import { BlockLineShortcuts } from "./BlockLineShortcuts";
import { BlockExitKeyboardShortcuts } from "./BlockExitKeyboardShortcuts";
import { CodeBlockExitKeyboardShortcuts } from "./CodeBlockExitKeyboardShortcuts";
import { BlockMoveShortcuts } from "./BlockMoveShortcuts";
import { HistoryKeyboardShortcuts } from "./HistoryKeyboardShortcuts";
import { FindInNoteExtension } from "./FindInNoteExtension";
import { MarkdownTableInput } from "./MarkdownTableInput";
import { MarkdownLinkInput } from "./MarkdownLinkInput";
import { LinkAutolinkGuards } from "./LinkAutolinkGuards";
import { shouldAutolinkUrl } from "./linkAutolinkUtils";
import { isValidLinkUrl } from "./inlineFormatActions";
import { TableKeyboardShortcuts } from "./TableKeyboardShortcuts";
import { SelectAllShortcuts } from "./SelectAllShortcuts";
import { PlaygroundDocument } from "./PlaygroundDocument";
import { getHunosCodeBlockExtension } from "./HunosCodeBlock";
import { getCodeBlockHighlightStyles } from "./codeBlockHighlightStyles";
import { resetEditorHistory } from "./resetEditorHistory";
import { syncNoteContentInEditor } from "./noteSwitchContentUtils";
import ListItem from "@tiptap/extension-list-item";
import { SelectionBubbleMenu } from "./SelectionBubbleMenu";
import { TableBubbleMenu } from "./TableBubbleMenu";
import { LinkEditorBubble } from "./LinkEditorBubble";
import History from "@tiptap/extension-history";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useTheme } from "@/theme/ThemeContext";
import { resolveTextFontFamily, resolveCodeFontFamily } from "@/utils/fonts";
import { useNoteStore } from "@/store/noteStore";
import { useTagStore } from "@/store/tagStore";
import { useUIStore } from "@/store/uiStore";
import { noteStorage } from "@/storage/noteStorage";
import { graphEngine } from "@/graph/graphEngine";
import { findNoteByWikiTitle } from "@/utils/wikiLink";
import type { Editor } from "@tiptap/react";
import type { EditorFont } from "@/types/settings";

interface TiptapEditorProps {
  noteId: string;
  initialContent: string;
  onChange: (json: string, flushSave?: boolean) => void;
  onEditorReady: (editor: Editor) => void;
  fontFamily: EditorFont;
  headingsFont: EditorFont;
  codeFont: EditorFont;
  fontSize: number;
  lineHeight: number;
  lineWidth: number;
  paragraphSpacing: number;
  hideCompletedTasks: boolean;
  accessibilityLabel?: string;
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
  hideCompletedTasks,
  accessibilityLabel,
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

  useEffect(() => {
    useUIStore.getState().closeLinkEditor();
  }, [noteId]);

  const handleWikiLinkClick = async (title: string) => {
    const store = useNoteStore.getState();
    let target = findNoteByWikiTitle(store.notes, title);

    if (!target) {
      target = await noteStorage.findActiveByTitle(title);
    }

    if (target) {
      await store.setActiveNote(target.id);
      return;
    }

    await store.createNote(title);
    const sourceNote = await noteStorage.get(noteIdRef.current);
    if (sourceNote?.content) {
      await graphEngine.syncNoteLinks(noteIdRef.current, sourceNote.content);
    }
  };

  const handleTagClick = async (tagName: string) => {
    const tag = useTagStore
      .getState()
      .tags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
    if (!tag) return;

    useTagStore.getState().setActiveTag(tag.id);
    await useNoteStore.getState().loadNotesByTag(tag.id);
    useUIStore.getState().navigate("noteList");
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        document: false,
        heading: { levels: [1, 2, 3] },
        bold: false,
        bulletList: false,
        strike: false,
        italic: false,
        code: false,
        listItem: false,
        history: false,
        codeBlock: false,
      }),
      PlaygroundDocument,
      getHunosCodeBlockExtension(),
      History.extend({
        addKeyboardShortcuts() {
          return {};
        },
      }),
      ListItem.extend({
        addKeyboardShortcuts() {
          return {
            Enter: () => this.editor.commands.splitListItem(this.name),
          };
        },
      }),
      MarkdownStarDebrisCleanup,
      MarkdownStrike,
      MarkdownItalic,
      MarkdownCode,
      MarkdownBold,
      MarkdownShortcuts,
      MarkdownTableInput,
      MarkdownLinkInput,
      MarkdownBulletList,
      Placeholder.configure({
        placeholder: t("editor.placeholder"),
      }),
      TaskList,
      MarkdownTaskItem.configure({
        nested: true,
        a11y: {
          checkboxLabel: (node, checked) => {
            const taskText =
              node.textContent.trim() || i18n.t("editor.task.empty");
            const stateLabel = checked
              ? i18n.t("editor.task.checkboxDone")
              : i18n.t("editor.task.checkboxOpen");
            return `${stateLabel}：${taskText}`;
          },
        },
      }),
      MarkdownHighlight.configure({ multicolor: true }),
      Underline,
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: "editor-link",
          target: "_blank",
          rel: "noopener noreferrer",
        },
        shouldAutoLink: (url) => shouldAutolinkUrl(url) && isValidLinkUrl(url),
      }),
      LinkAutolinkGuards,
      Image.extend({
        selectable: true,
        addAttributes() {
          return {
            src: { default: null },
            alt: { default: null },
            title: { default: null },
            height: {
              default: null,
              renderHTML: (attrs) => {
                if (!attrs.height) return {};
                return {
                  style: `height: ${attrs.height}px; object-fit: contain;`,
                };
              },
              parseHTML: (el) => {
                const h = el.style.height;
                return h ? parseInt(h, 10) || null : null;
              },
            },
            "data-sketch": {
              default: null,
              renderHTML: (attrs) => {
                if (!attrs["data-sketch"]) return {};
                return { "data-sketch": "true" };
              },
              parseHTML: (el) => el.getAttribute("data-sketch"),
            },
            "data-testid": {
              default: null,
              renderHTML: (attrs) => {
                const testId = attrs["data-testid"];
                if (!testId) return {};
                return { "data-testid": testId };
              },
              parseHTML: (el) => el.getAttribute("data-testid"),
            },
          };
        },
      }).configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: "editor-image" },
      }),
      HunosTable.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      MarkdownReveal,
      ImagePasteDrop,
      MarkdownPaste,
      WikiLinkDecoration.configure({
        onWikiLinkClick: handleWikiLinkClick,
        getNotes: () => notesRef.current,
      }),
      WikiLinkSuggestion.configure({
        getNoteId: () => noteIdRef.current,
        getNotes: () => notesRef.current,
      }),
      TagSuggestion.configure({
        getTags: () => tagsRef.current,
      }),
      TagDecoration.configure({ onTagClick: handleTagClick }),
      SketchResize,
      FocusModeShortcuts,
      EditorKeyboardShortcuts,
      DocumentEndKeyboardShortcuts,
      ListOutlineShortcuts,
      TableKeyboardShortcuts,
      HeadingListBoundaryShortcuts,
      ListKeyboardShortcuts,
      BlockExitKeyboardShortcuts,
      CodeBlockExitKeyboardShortcuts,
      BlockMoveShortcuts,
      BlockLineShortcuts,
      HistoryKeyboardShortcuts,
      SelectAllShortcuts,
      FindInNoteExtension,
    ],
    content: initialContent ? tryParseJson(initialContent) : undefined,
    onUpdate: ({ editor, transaction }) => {
      const json = JSON.stringify(editor.getJSON());
      const flushSave =
        transaction.getMeta(TASK_LIST_TOGGLE_REORDER_META) === true;
      onChange(json, flushSave);
    },
    editorProps: {
      attributes: {
        class: "hunos-editor",
        ...(accessibilityLabel
          ? {
              "aria-label": accessibilityLabel,
              role: "textbox",
              "aria-multiline": "true",
            }
          : {}),
      },
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const dom = editor.view.dom;
    const applyA11yLabel = () => {
      if (accessibilityLabel) {
        dom.setAttribute("aria-label", accessibilityLabel);
        dom.removeAttribute("aria-labelledby");
        dom.setAttribute("role", "textbox");
        dom.setAttribute("aria-multiline", "true");
      } else {
        dom.removeAttribute("aria-label");
        dom.removeAttribute("aria-labelledby");
        dom.removeAttribute("role");
        dom.removeAttribute("aria-multiline");
      }
    };
    applyA11yLabel();
    editor.on("update", applyA11yLabel);
    return () => {
      editor.off("update", applyA11yLabel);
    };
  }, [editor, accessibilityLabel]);

  useEffect(() => {
    if (editor) onEditorReady(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor) return;
    applyHideCompletedTasksDomAttribute(editor.view.dom, hideCompletedTasks);
  }, [editor, hideCompletedTasks]);

  useEffect(() => {
    if (!editor) return;

    const noteChanged = prevNoteIdRef.current !== noteId;
    const contentChangedExternally =
      !noteChanged && initialContent !== lastExternalContentRef.current;

    const outcome = syncNoteContentInEditor({
      initialContent,
      noteChanged,
      contentChangedExternally,
      editorContentJson: JSON.stringify(editor.getJSON()),
      setContent: (parsed) => {
        editor
          .chain()
          .setMeta("addToHistory", false)
          .setContent(parsed, false)
          .run();
      },
      clearContent: () => {
        editor.chain().setMeta("addToHistory", false).clearContent(true).run();
      },
      resetHistory: () => resetEditorHistory(editor),
      focusStart: () => editor.commands.focus("start"),
    });

    if (outcome === "noop") return;

    if (outcome === "skipped-echo") {
      lastExternalContentRef.current = initialContent;
      return;
    }

    prevNoteIdRef.current = noteId;
    lastExternalContentRef.current = initialContent;
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

  const pMargin = paragraphSpacing > 0 ? `${paragraphSpacing}em` : "0.5em";

  const wikiLinkClickRef = useRef(handleWikiLinkClick);
  wikiLinkClickRef.current = handleWikiLinkClick;

  useEffect(() => {
    if (!editor) return;
    registerWikiLinkActivator((title) =>
      activateWikiLinkByTitle(editor.view, title, (t) =>
        wikiLinkClickRef.current(t),
      ),
    );
    return () => registerWikiLinkActivator(null);
  }, [editor]);

  return (
    <>
      <style aria-hidden="true">{`
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
          white-space: pre;
        }
        ${getCodeBlockHighlightStyles(theme.isDark)}
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
        .hunos-editor ul[data-type="taskList"] li[data-checked="true"] > div {
          color: ${theme.colors.textTertiary};
          text-decoration: line-through;
        }
        .hunos-editor ul[data-type="taskList"] li[data-checked="true"] > div .editor-link,
        .hunos-editor ul[data-type="taskList"] li[data-checked="true"] > div a {
          color: ${theme.colors.textTertiary};
        }
        .hunos-editor[data-hide-completed-tasks="true"] ul[data-type="taskList"] li[data-checked="true"] {
          display: none;
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
        .sketch-resize-handle[data-active="true"] {
          opacity: 1;
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
        .hunos-editor .editor-image:hover + .sketch-resize-handle,
        .hunos-editor .editor-image.ProseMirror-selectednode + .sketch-resize-handle {
          opacity: 1;
        }
        .hunos-editor .tableWrapper {
          overflow-x: auto;
          margin: 0.6em 0;
        }
        .hunos-editor table {
          border-collapse: collapse;
          width: 100%;
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
          cursor: pointer;
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
          display: inline;
          vertical-align: baseline;
          pointer-events: auto;
        }
        .find-match-inactive {
          background: ${theme.colors.accentLight};
          border-radius: 2px;
          padding: 0.05em 0;
        }
        .find-match-active {
          background: ${theme.colors.accent};
          color: ${theme.colors.accentText};
          border-radius: 2px;
          padding: 0.05em 0;
        }
      `}</style>
      <div data-testid="note-editor">
        <EditorContent editor={editor} />
      </div>
      <SelectionBubbleMenu editor={editor} />
      <TableBubbleMenu editor={editor} />
      <LinkEditorBubble editor={editor} />
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
