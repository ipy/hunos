import React, { useCallback, useEffect, useRef, useState } from "react";
import { BubbleMenu } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeContext";
import { Icon } from "@/components/common/Icon";
import { useUIStore } from "@/store/uiStore";
import {
  applyLinkUrl,
  getLinkEditorInitialUrl,
  prepareLinkEditor,
  removeLinkFromEditor,
} from "./inlineFormatActions";

interface LinkEditorBubbleProps {
  editor: Editor | null;
}

export function LinkEditorBubble({ editor }: LinkEditorBubbleProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const linkEditorOpen = useUIStore((s) => s.linkEditorOpen);
  const closeLinkEditor = useUIStore((s) => s.closeLinkEditor);
  const [url, setUrl] = useState("");
  const [showRemove, setShowRemove] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editor || !linkEditorOpen) return;
    prepareLinkEditor(editor);
    setShowRemove(editor.isActive("link"));
    setUrl(getLinkEditorInitialUrl(editor));
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [editor, linkEditorOpen]);

  const handleClose = useCallback(() => {
    closeLinkEditor();
    editor?.commands.focus();
  }, [closeLinkEditor, editor]);

  const handleApply = useCallback(() => {
    if (!editor) return;
    if (!applyLinkUrl(editor, url)) return;
    closeLinkEditor();
  }, [closeLinkEditor, editor, url]);

  const handleRemove = useCallback(() => {
    if (!editor) return;
    removeLinkFromEditor(editor);
    closeLinkEditor();
  }, [closeLinkEditor, editor]);

  useEffect(() => {
    if (!linkEditorOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [handleClose, linkEditorOpen]);

  if (!editor || !linkEditorOpen) return null;

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="linkEditorBubble"
      updateDelay={0}
      shouldShow={() => linkEditorOpen}
      tippyOptions={{
        duration: 150,
        placement: "bottom",
        offset: [0, 8],
        zIndex: 210,
        onHide: () => {
          if (useUIStore.getState().linkEditorOpen) {
            closeLinkEditor();
          }
        },
        popperOptions: {
          modifiers: [
            {
              name: "flip",
              options: { fallbackPlacements: ["top", "bottom"] },
            },
            {
              name: "preventOverflow",
              options: {
                boundary: "viewport",
                padding: 8,
                altAxis: true,
              },
            },
          ],
        },
      }}
    >
      <div
        data-hunos-link-editor="true"
        data-testid="link-editor-bubble"
        role="dialog"
        aria-label={t("editor.link.prompt")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 8px",
          borderRadius: 10,
          border: `1px solid ${theme.colors.borderLight}`,
          backgroundColor: theme.isDark
            ? "rgba(28,28,30,0.98)"
            : "rgba(255,255,255,0.98)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: theme.isDark
            ? "0 4px 20px rgba(0,0,0,0.45)"
            : "0 4px 20px rgba(0,0,0,0.12)",
          minWidth: 280,
          maxWidth: "min(420px, calc(100vw - 24px))",
        }}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
      >
        <Icon name="link" size={16} color={theme.colors.textTertiary} />
        <input
          ref={inputRef}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleApply();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              handleClose();
            }
          }}
          placeholder={t("editor.link.placeholder")}
          aria-label={t("editor.link.prompt")}
          data-testid="link-editor-input"
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: 14,
            color: theme.colors.text,
            minWidth: 0,
          }}
        />
        {showRemove && (
          <button
            type="button"
            onClick={handleRemove}
            aria-label={t("editor.link.remove")}
            title={t("editor.link.remove")}
            data-testid="link-editor-remove"
            style={secondaryButtonStyle(theme)}
          >
            {t("editor.link.remove")}
          </button>
        )}
        <button
          type="button"
          onClick={handleApply}
          aria-label={t("editor.link.apply")}
          title={t("editor.link.apply")}
          data-testid="link-editor-apply"
          style={primaryButtonStyle(theme)}
        >
          {t("editor.link.apply")}
        </button>
      </div>
    </BubbleMenu>
  );
}

function primaryButtonStyle(
  theme: ReturnType<typeof useTheme>,
): React.CSSProperties {
  return {
    border: "none",
    borderRadius: theme.radius.md,
    cursor: "pointer",
    padding: "5px 10px",
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: theme.colors.accent,
    color: theme.colors.accentText,
    whiteSpace: "nowrap",
    flexShrink: 0,
  };
}

function secondaryButtonStyle(
  theme: ReturnType<typeof useTheme>,
): React.CSSProperties {
  return {
    border: `1px solid ${theme.colors.borderLight}`,
    borderRadius: theme.radius.md,
    cursor: "pointer",
    padding: "5px 10px",
    fontSize: 13,
    background: "transparent",
    color: theme.colors.textSecondary,
    whiteSpace: "nowrap",
    flexShrink: 0,
  };
}
