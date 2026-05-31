import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Editor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/ThemeContext";
import { Icon } from "@/components/common/Icon";
import { useUIStore } from "@/store/uiStore";
import { isMobileViewport } from "@/hooks/useAdaptiveLayout";
import {
  applyLinkUrl,
  getLinkEditorInitialUrl,
  removeLinkFromEditor,
} from "./inlineFormatActions";
import { getLinkEditorAnchorRect } from "./linkEditorSelection";

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
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [useModalLayout, setUseModalLayout] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updateAnchor = useCallback(() => {
    if (!editor || editor.isDestroyed || !linkEditorOpen) {
      setAnchorRect(null);
      return;
    }
    setUseModalLayout(isMobileViewport());
    if (!isMobileViewport()) {
      setAnchorRect(getLinkEditorAnchorRect(editor));
    }
  }, [editor, linkEditorOpen]);

  useEffect(() => {
    if (!editor || !linkEditorOpen) return;
    setShowRemove(editor.isActive("link"));
    setUrl(getLinkEditorInitialUrl(editor));
    updateAnchor();
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [editor, linkEditorOpen, updateAnchor]);

  useEffect(() => {
    if (!editor || !linkEditorOpen) return;
    updateAnchor();
    editor.on("transaction", updateAnchor);
    editor.on("selectionUpdate", updateAnchor);
    window.addEventListener("scroll", updateAnchor, true);
    window.addEventListener("resize", updateAnchor);
    return () => {
      editor.off("transaction", updateAnchor);
      editor.off("selectionUpdate", updateAnchor);
      window.removeEventListener("scroll", updateAnchor, true);
      window.removeEventListener("resize", updateAnchor);
    };
  }, [editor, linkEditorOpen, updateAnchor]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel || useModalLayout || !anchorRect) return;

    const margin = 8;
    let top = anchorRect.bottom + margin;
    let left = anchorRect.left;

    const panelRect = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (left + panelRect.width > vw - margin) {
      left = Math.max(margin, vw - panelRect.width - margin);
    }
    if (left < margin) left = margin;

    if (top + panelRect.height > vh - margin) {
      const above = anchorRect.top - panelRect.height - margin;
      top =
        above >= margin
          ? above
          : Math.max(margin, vh - panelRect.height - margin);
    }

    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
    panel.style.transform = "";
  }, [anchorRect, url, showRemove, useModalLayout]);

  const handleClose = useCallback(() => {
    closeLinkEditor();
    if (editor && !editor.isDestroyed) {
      editor.commands.focus();
    }
  }, [closeLinkEditor, editor]);

  const handleApply = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    if (!applyLinkUrl(editor, url)) return;
    closeLinkEditor();
    editor.commands.focus();
  }, [closeLinkEditor, editor, url]);

  const handleRemove = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    removeLinkFromEditor(editor);
    closeLinkEditor();
    editor.commands.focus();
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

  const panelStyle: React.CSSProperties = useModalLayout
    ? {
        position: "fixed",
        zIndex: 250,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(420px, calc(100vw - 32px))",
      }
    : {
        position: "fixed",
        zIndex: 250,
        minWidth: 280,
        maxWidth: "min(420px, calc(100vw - 24px))",
      };

  return (
    <>
      <div
        data-testid="link-editor-backdrop"
        aria-hidden="true"
        onMouseDown={(e) => {
          e.preventDefault();
          handleClose();
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 249,
          backgroundColor: theme.isDark
            ? "rgba(0,0,0,0.45)"
            : "rgba(0,0,0,0.25)",
        }}
      />
      <div
        ref={panelRef}
        data-hunos-link-editor="true"
        data-testid="link-editor-bubble"
        role="dialog"
        aria-modal="true"
        aria-label={t("editor.link.prompt")}
        style={{
          ...panelStyle,
          display: "flex",
          flexDirection: useModalLayout ? "column" : "row",
          alignItems: useModalLayout ? "stretch" : "center",
          gap: useModalLayout ? 10 : 6,
          padding: useModalLayout ? "14px 16px" : "6px 8px",
          borderRadius: useModalLayout ? 14 : 10,
          border: `1px solid ${theme.colors.borderLight}`,
          backgroundColor: theme.isDark
            ? "rgba(28,28,30,0.98)"
            : "rgba(255,255,255,0.98)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: theme.isDark
            ? "0 4px 20px rgba(0,0,0,0.45)"
            : "0 4px 20px rgba(0,0,0,0.12)",
        }}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: 1,
            minWidth: 0,
          }}
        >
          <Icon name="link" size={16} color={theme.colors.textTertiary} />
          <input
            ref={inputRef}
            type="text"
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
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: useModalLayout ? "flex-end" : "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClose}
            aria-label={t("editor.link.cancel")}
            title={t("editor.link.cancel")}
            data-testid="link-editor-cancel"
            style={secondaryButtonStyle(theme)}
          >
            {t("editor.link.cancel")}
          </button>
          {showRemove && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
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
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleApply}
            aria-label={t("editor.link.apply")}
            title={t("editor.link.apply")}
            data-testid="link-editor-apply"
            style={primaryButtonStyle(theme)}
          >
            {t("editor.link.apply")}
          </button>
        </div>
      </div>
    </>
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
